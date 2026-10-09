"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, SendHorizontal, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/actions/comments";
import type { PostComment } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { CloseButton, Sheet } from "@/components/ui/overlay";
import { Tick } from "@/components/ui/tick";
import { burst, haptic } from "@/lib/celebrate";
import { cn, compact, timeAgo } from "@/lib/format";

type Viewer = { id: string; isAdmin: boolean } | null;

/** The comment list + composer, shared by the sheet (Watch, feed) and the post page. */
export function CommentThread({
  postId,
  postAuthorId,
  viewer,
  initial,
  onCount,
  autoFocus,
  className,
}: {
  postId: number;
  postAuthorId: string;
  viewer: Viewer;
  initial?: PostComment[];
  onCount?: (n: number) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [comments, setComments] = useState<PostComment[] | null>(initial ?? null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const list = useRef<HTMLOListElement>(null);
  const send = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d: { comments: PostComment[] }) => alive && setComments(d.comments))
      .catch(() => alive && setComments([]));
    return () => {
      alive = false;
    };
  }, [postId, initial]);

  useEffect(() => {
    onCount?.(comments?.length ?? 0);
    list.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [comments, onCount]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    start(async () => {
      const res = await addComment(postId, body).catch(() => ({ error: "Couldn't post that. Try again." }));
      if ("error" in res) return setError(res.error);
      setText("");
      setComments((c) => [...(c ?? []), res.comment]);
      haptic();
      burst(send.current, { count: 7, spread: 40 });
    });
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <ol ref={list} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4" aria-live="polite">
        {comments === null &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-3">
              <span className="skeleton h-9 w-9 rounded-full" />
              <span className="flex-1 space-y-2">
                <span className="skeleton block h-3 w-24" />
                <span className="skeleton block h-3 w-4/5" />
              </span>
            </li>
          ))}
        {comments?.length === 0 && <li className="py-10 text-center text-[14px] text-muted">No comments yet. Start the conversation.</li>}
        {comments?.map((c) => {
          const canDelete = viewer && (viewer.id === c.user.id || viewer.id === postAuthorId || viewer.isAdmin);
          return (
            <li key={c.id} className="animate-fade-slide-up group flex gap-3">
              <Link href={`/u/${c.user.handle}`} className="shrink-0">
                <Avatar name={c.user.displayName} url={c.user.avatarUrl} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[13px]">
                  <Link href={`/u/${c.user.handle}`} className="truncate font-semibold">{c.user.displayName}</Link>
                  <Tick role={c.user.role} verified={c.user.verified} size={13} />
                  <span className="text-muted">· {timeAgo(new Date(c.createdAt))}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-[14px] leading-snug">{c.body}</p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => {
                    setComments((all) => all?.filter((x) => x.id !== c.id) ?? null);
                    deleteComment(c.id).catch(() => {});
                  }}
                  className="self-start p-1 text-subtle opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {viewer ? (
        <form onSubmit={submit} className="border-t border-line bg-surface px-4 pb-3 pt-3">
          {error && <p role="alert" className="mb-2 text-[13px] text-danger">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              rows={1}
              maxLength={400}
              autoFocus={autoFocus}
              placeholder="Add a comment…"
              aria-label="Comment"
              className="field max-h-28 min-h-11 flex-1 resize-none py-2.5"
            />
            <button ref={send} type="submit" disabled={!text.trim() || pending} aria-label="Send comment" className="btn btn-accent btn-icon h-11">
              <SendHorizontal size={18} />
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-line p-4 text-center text-[14px]">
          <Link href="/login" className="font-semibold text-cobalt">Sign in</Link> to comment.
        </div>
      )}
    </div>
  );
}

/** Round comment button for media overlays; opens the comments sheet. */
export function CommentButton({ postId, postAuthorId, count, viewer }: { postId: number; postAuthorId: string; count: number; viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(count);
  return (
    <>
      <button type="button" aria-label={`Comments (${n})`} onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white">
        <span className="glass-dark grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90">
          <MessageCircle size={20} strokeWidth={2.2} />
        </span>
        {compact(n)}
      </button>
      {open && (
        <Sheet title="Comments" tall onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="h5">
              Comments <span className="text-muted">{n > 0 ? compact(n) : ""}</span>
            </p>
            <CloseButton onClick={() => setOpen(false)} />
          </div>
          <CommentThread postId={postId} postAuthorId={postAuthorId} viewer={viewer} onCount={setN} className="flex-1" />
        </Sheet>
      )}
    </>
  );
}
