"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, Ban, Bell, BellOff, Check, Clock, Lock, SendHorizontal, ShieldAlert, Trash2 } from "lucide-react";
import { deleteLeagueMessage, sendLeagueMessage, setLeagueMuted } from "@/actions/league-chat";
import type { LeagueMessage } from "@/lib/fantasy/chat";
import { UNREAD_EVENT } from "@/lib/chat/events";
import { checkMessage } from "@/lib/chat/filter";
import { burst, haptic } from "@/lib/celebrate";
import { cn, formatDate, formatTime } from "@/lib/format";

const POLL_MS = 4000;
const GROUP_MS = 5 * 60_000;

type Item = (LeagueMessage & { pending?: boolean }) | { id: string; notice: string };
const isNotice = (i: Item): i is { id: string; notice: string } => "notice" in i;

function dayLabel(iso: string) {
  const key = (x: Date) => formatDate(x, { year: "numeric", month: "2-digit", day: "2-digit" });
  const d = new Date(iso);
  if (key(d) === key(new Date())) return "Today";
  if (key(d) === key(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return formatDate(d, { weekday: "long", day: "numeric", month: "short" });
}

// Team "avatars": initials on a brand fill picked from the name.
const FILLS = ["bg-navy text-green", "bg-cobalt text-white", "bg-green text-navy", "bg-gray-500 text-white"];
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function TeamBadge({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", FILLS[hash(name) % FILLS.length])}>{initials}</span>;
}

const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

/**
 * League chat (WhatsApp pattern, kept simple): team names only, polling for new messages while the
 * screen is open, read marker moved as messages are seen, mute, delete-for-everyone placeholders and a
 * private reminder when a message is refused by the safety filter.
 */
export function LeagueChat({
  leagueId,
  initial,
  viewer,
  muted: initialMuted,
}: {
  leagueId: number;
  initial: LeagueMessage[];
  viewer: { entryId: number; teamName: string; realName: string; moderator: boolean };
  muted: boolean;
}) {
  const [items, setItems] = useState<Item[]>(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= 40);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(initialMuted);
  const [unseen, setUnseen] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [, start] = useTransition();
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const stick = useRef(true);
  const sendBtn = useRef<HTMLButtonElement>(null);

  const merge = useCallback(
    (incoming: LeagueMessage[]) => {
      if (!incoming.length) return;
      setItems((cur) => {
        const byId = new Map(cur.filter((i): i is LeagueMessage => !isNotice(i)).map((m) => [m.id, m]));
        const fresh = incoming.filter((m) => !byId.has(m.id));
        lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
        if (!nearBottom()) setUnseen((n) => n + fresh.filter((m) => m.sender.entryId !== viewer.entryId).length);
        return [...cur, ...fresh];
      });
    },
    [viewer.entryId],
  );

  // Poll while the chat is open; mark messages read only while it's actually visible.
  useEffect(() => {
    let stop = false;
    let first = true;
    const tick = async () => {
      const visible = document.visibilityState === "visible";
      if (!visible) return;
      const r = await fetch(`/api/fantasy/leagues/${leagueId}/messages?after=${lastId.current}&read=1`, { cache: "no-store" }).catch(() => null);
      if (stop || !r?.ok) return;
      const { messages } = (await r.json()) as { messages: LeagueMessage[] };
      stick.current = nearBottom();
      merge(messages);
      // Messages were just marked read: let the tab bar refresh its unread badge.
      if (first || messages.length) window.dispatchEvent(new Event(UNREAD_EVENT));
      first = false;
    };
    tick();
    const t = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [leagueId, merge]);

  useLayoutEffect(() => {
    if (stick.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [items]);

  useEffect(() => {
    const onScroll = () => nearBottom() && setUnseen(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const notice = (msg: string) => {
    stick.current = true;
    setItems((cur) => [...cur, { id: `n${Date.now()}`, notice: msg }]);
    haptic(20);
  };

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    // Instant feedback on the phone; the server runs the same check and is the one that counts.
    const verdict = checkMessage(body, { realName: viewer.realName });
    if (!verdict.ok) {
      notice(verdict.notice);
      // The server logs the attempt (never the text) so repeated attempts trigger the short pause.
      void sendLeagueMessage(leagueId, body)
        .then((r) => "blocked" in r && r.blocked.kind === "cooldown" && notice(r.blocked.notice))
        .catch(() => {});
      return;
    }
    setText("");
    const temp: LeagueMessage & { pending: boolean } = { id: -Date.now(), body, createdAt: new Date().toISOString(), deleted: false, sender: { entryId: viewer.entryId, teamName: viewer.teamName }, pending: true };
    stick.current = true;
    setItems((cur) => [...cur, temp]);
    burst(sendBtn.current, { count: 6, spread: 34 });
    const res = await sendLeagueMessage(leagueId, body).catch(() => ({ error: "Not sent. Check your connection." }));
    if ("message" in res) {
      lastId.current = Math.max(lastId.current, res.message.id);
      setItems((cur) => cur.map((i) => (i === temp ? res.message : i)).filter((i, idx, all) => isNotice(i) || all.findIndex((x) => !isNotice(x) && x.id === i.id) === idx));
      return;
    }
    setItems((cur) => cur.filter((i) => i !== temp));
    if ("blocked" in res) notice(res.blocked.notice);
    else {
      notice(res.error);
      setText(body);
    }
  }

  async function loadOlder() {
    const first = items.find((i): i is LeagueMessage => !isNotice(i) && i.id > 0)?.id;
    if (!first) return;
    const before = document.documentElement.scrollHeight;
    const r = await fetch(`/api/fantasy/leagues/${leagueId}/messages?before=${first}`).catch(() => null);
    if (!r?.ok) return;
    const { messages } = (await r.json()) as { messages: LeagueMessage[] };
    setHasOlder(messages.length >= 40);
    stick.current = false;
    setItems((cur) => [...messages, ...cur]);
    requestAnimationFrame(() => window.scrollBy({ top: document.documentElement.scrollHeight - before }));
  }

  function remove(m: LeagueMessage) {
    setSelected(null);
    (document.activeElement as HTMLElement | null)?.blur();
    setItems((cur) => cur.map((i) => (!isNotice(i) && i.id === m.id ? { ...i, body: "", deleted: true } : i)));
    start(() => deleteLeagueMessage(m.id).catch(() => {}));
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-start gap-2 rounded-2xl bg-navy p-3 text-white">
        <Lock size={16} className="mt-0.5 shrink-0 text-green" />
        <p className="flex-1 text-[12px] leading-snug text-white/75">
          You appear as <span className="font-semibold text-white">{viewer.teamName}</span>. Team names only, no phone numbers, emails or card details, and keep it friendly.
        </p>
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            start(async () => {
              await setLeagueMuted(leagueId, next);
              window.dispatchEvent(new Event(UNREAD_EVENT));
            });
          }}
          aria-pressed={muted}
          aria-label={muted ? "Unmute chat" : "Mute chat"}
          title={muted ? "Muted: no unread badge" : "Mute"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          {muted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
      </div>

      {hasOlder && (
        <button type="button" onClick={loadOlder} className="mx-auto mb-3 rounded-full bg-gray-200 px-3.5 py-1.5 text-[12px] font-semibold text-muted hover:text-ink">
          Load earlier messages
        </button>
      )}
      {items.length === 0 && <div className="rounded-2xl border border-dashed border-line p-8 text-center text-[14px] text-muted">No messages yet. Start the banter: who are you captaining?</div>}

      <ol className="flex flex-col gap-0.5" aria-label="Messages" aria-live="polite">
        {items.map((item, i) => {
          if (isNotice(item)) {
            return (
              <li key={item.id} className="animate-fade-slide-up my-2 flex justify-center">
                <div className="max-w-[90%] rounded-2xl border border-warning/50 bg-warning/15 px-3.5 py-2.5 text-[13px] leading-snug">
                  <p className="flex items-start gap-2">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{item.notice}</span>
                  </p>
                  <p className="mt-1 pl-6 text-[11px] text-muted">Only you can see this. Your message wasn&apos;t sent.</p>
                </div>
              </li>
            );
          }
          const m = item;
          const prev = items.slice(0, i).reverse().find((x): x is LeagueMessage => !isNotice(x));
          const mine = m.sender.entryId === viewer.entryId;
          const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
          const grouped = !newDay && prev && prev.sender.entryId === m.sender.entryId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
          // Like WhatsApp: tap your own message (or any, as a moderator) to select it, then delete.
          const deletable = !m.pending && !m.deleted && (mine || viewer.moderator);
          const picked = deletable && selected === m.id;
          const toggle = () => deletable && setSelected(picked ? null : m.id);
          return (
            <li key={m.id} className="contents">
              {newDay && <p className="my-3 self-center rounded-full bg-gray-200/80 px-3 py-1 text-[11px] font-semibold text-muted">{dayLabel(m.createdAt)}</p>}
              <div className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row", !grouped && "mt-2.5")}>
                {!mine && <span className="w-8 shrink-0">{!grouped && <TeamBadge name={m.sender.teamName} />}</span>}
                <div className={cn("max-w-[78%]", m.pending && "opacity-60")}>
                  {!mine && !grouped && <p className="mb-0.5 ml-1 text-[11px] font-semibold text-cobalt">{m.sender.teamName}</p>}
                  <div
                    {...(deletable && {
                      role: "button",
                      tabIndex: 0,
                      "aria-expanded": picked,
                      onClick: toggle,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        toggle();
                      },
                    })}
                    className={cn(
                      "whitespace-pre-line break-words px-3.5 py-2 text-[15px] leading-snug transition-shadow",
                      mine ? "rounded-2xl rounded-br-md bg-navy text-white" : "rounded-2xl rounded-bl-md border border-line bg-surface",
                      deletable && "cursor-pointer select-none",
                      picked && "ring-2 ring-cobalt ring-offset-2 ring-offset-bg",
                    )}
                  >
                    {m.deleted ? (
                      <span className={cn("inline-flex items-center gap-1.5 italic", mine ? "text-white/55" : "text-muted")}>
                        <Ban size={13} /> This message was deleted
                      </span>
                    ) : (
                      m.body
                    )}
                    <span className={cn("ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[10px] tabular", mine ? "text-white/50" : "text-subtle")}>
                      {m.pending ? <Clock size={10} /> : formatTime(new Date(m.createdAt))}
                      {mine && !m.pending && !m.deleted && <Check size={11} />}
                    </span>
                  </div>
                  {picked && (
                    <div className={cn("animate-fade-slide-up mt-1.5 flex gap-1.5", mine && "justify-end")}>
                      <button type="button" onClick={() => setSelected(null)} className="rounded-full bg-gray-200 px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink">
                        Cancel
                      </button>
                      <button type="button" onClick={() => remove(m)} className="inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1.5 text-[12px] font-semibold text-white">
                        <Trash2 size={13} /> Delete for everyone
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={send} className="sticky-above-tabbar z-20 mt-4">
        {unseen > 0 && (
          <button type="button" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })} className="animate-fade-slide-up absolute -top-12 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-cobalt px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg">
            <ArrowDown size={14} /> {unseen} new
          </button>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-[0_12px_30px_-16px_rgba(8,16,24,.45)] backdrop-blur">
          <textarea
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
            maxLength={500}
            placeholder={`Message as ${viewer.teamName}`}
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
