"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, SendHorizontal, Trash2 } from "lucide-react";
import { deleteMessage, sendMessage } from "@/actions/communities";
import type { ChatMessage } from "@/lib/communities";
import { Avatar } from "@/components/ui/avatar";
import { burst, haptic } from "@/lib/celebrate";
import { cn, formatDate, formatTime } from "@/lib/format";

const POLL_MS = 4000;
const GROUP_MS = 5 * 60_000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const key = (x: Date) => formatDate(x, { year: "numeric", month: "2-digit", day: "2-digit" });
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yesterday)) return "Yesterday";
  return formatDate(d, { weekday: "long", day: "numeric", month: "short" });
}

const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

/**
 * Community group chat. New messages arrive by polling (every 4s while the tab is visible), so it
 * works on any host without websockets. Sends are optimistic.
 */
export function ChatRoom({ communityId, initial, viewer }: { communityId: number; initial: ChatMessage[]; viewer: { id: string; moderator: boolean } }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= 40);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(0);
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const stick = useRef(true);
  const sendBtn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (!fresh.length) return cur;
      lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
      if (!nearBottom()) setUnseen((n) => n + fresh.filter((m) => m.user.id !== viewer.id).length);
      return [...cur, ...fresh].sort((a, b) => a.id - b.id);
    });
  }, [viewer.id]);

  // Poll for new messages while visible.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await fetch(`/api/communities/${communityId}/messages?after=${lastId.current}`, { cache: "no-store" }).catch(() => null);
      if (!r?.ok || stop) return;
      const { messages: fresh } = (await r.json()) as { messages: ChatMessage[] };
      stick.current = nearBottom();
      merge(fresh.filter((m) => m.id > 0));
    };
    const t = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [communityId, merge]);

  // Keep the view pinned to the newest message when the reader is already at the bottom.
  useLayoutEffect(() => {
    if (stick.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const onScroll = () => nearBottom() && setUnseen(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadOlder = async () => {
    const first = messages.find((m) => m.id > 0)?.id;
    if (!first) return;
    const before = document.documentElement.scrollHeight;
    const r = await fetch(`/api/communities/${communityId}/messages?before=${first}`).catch(() => null);
    if (!r?.ok) return;
    const { messages: older } = (await r.json()) as { messages: ChatMessage[] };
    setHasOlder(older.length >= 40);
    stick.current = false;
    setMessages((cur) => [...older.filter((o) => !cur.some((c) => c.id === o.id)), ...cur]);
    requestAnimationFrame(() => window.scrollBy({ top: document.documentElement.scrollHeight - before }));
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    const temp: ChatMessage = { id: -Date.now(), body, createdAt: new Date().toISOString(), user: { id: viewer.id, handle: "", displayName: "You", avatarUrl: null } };
    stick.current = true;
    setMessages((m) => [...m, temp]);
    haptic();
    burst(sendBtn.current, { count: 6, spread: 34 });
    const res = await sendMessage(communityId, body).catch(() => ({ error: "Not sent. Check your connection." }));
    if ("error" in res) {
      setError(res.error);
      setText(body);
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      return;
    }
    lastId.current = Math.max(lastId.current, res.message.id);
    setMessages((m) => m.map((x) => (x.id === temp.id ? res.message : x)).filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i));
    input.current?.focus();
  };

  return (
    <div className="flex flex-col">
      {hasOlder && (
        <button type="button" onClick={loadOlder} className="mx-auto mb-3 rounded-full bg-gray-200 px-3.5 py-1.5 text-[12px] font-semibold text-muted hover:text-ink">
          Load earlier messages
        </button>
      )}
      {messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-[14px] text-muted">
          No messages yet. Say hello and get things moving.
        </div>
      )}
      <ol className="flex flex-col gap-0.5" aria-label="Messages" aria-live="polite">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const mine = m.user.id === viewer.id;
          const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
          const grouped = !newDay && prev && prev.user.id === m.user.id && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
          const pending = m.id < 0;
          return (
            <li key={m.id} className="contents">
              {newDay && (
                <p className="my-3 self-center rounded-full bg-gray-200/80 px-3 py-1 text-[11px] font-semibold text-muted">{dayLabel(m.createdAt)}</p>
              )}
              <div className={cn("group flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row", !grouped && "mt-2.5")}>
                {!mine && (
                  <span className="w-8 shrink-0">
                    {!grouped && (
                      <Link href={`/u/${m.user.handle}`} aria-label={m.user.displayName}>
                        <Avatar name={m.user.displayName} url={m.user.avatarUrl} size={32} />
                      </Link>
                    )}
                  </span>
                )}
                <div className={cn("animate-fade-slide-up max-w-[78%]", pending && "opacity-60")} style={{ animationDuration: "0.4s" }}>
                  {!mine && !grouped && <p className="mb-0.5 ml-1 text-[11px] font-semibold text-muted">{m.user.displayName}</p>}
                  <div
                    className={cn(
                      "whitespace-pre-line break-words px-3.5 py-2 text-[15px] leading-snug",
                      mine ? "rounded-2xl rounded-br-md bg-navy text-white" : "rounded-2xl rounded-bl-md border border-line bg-surface",
                    )}
                  >
                    {m.body}
                    <span className={cn("ml-2 inline-block translate-y-0.5 text-[10px] tabular", mine ? "text-white/50" : "text-subtle")}>{pending ? "…" : formatTime(new Date(m.createdAt))}</span>
                  </div>
                </div>
                {!pending && (mine || viewer.moderator) && (
                  <button
                    type="button"
                    aria-label="Delete message"
                    onClick={() => {
                      setMessages((all) => all.filter((x) => x.id !== m.id));
                      deleteMessage(m.id).catch(() => {});
                    }}
                    className="mb-1 p-1 text-subtle opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={send} className="sticky-above-tabbar z-20 mt-4">
        {unseen > 0 && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
            className="animate-fade-slide-up absolute -top-12 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-cobalt px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg"
          >
            <ArrowDown size={14} /> {unseen} new
          </button>
        )}
        {error && <p role="alert" className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-[13px]">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-[0_12px_30px_-16px_rgba(8,16,24,.45)] backdrop-blur">
          <textarea
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            rows={1}
            maxLength={1000}
            placeholder="Message the group"
            aria-label="Message"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] outline-none placeholder:text-subtle md:text-[15px]"
          />
          <button ref={sendBtn} type="submit" disabled={!text.trim()} aria-label="Send" className="btn btn-accent btn-icon h-10">
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
