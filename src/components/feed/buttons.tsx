"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, HandHeart, Heart, MessageCircle, Share2 } from "lucide-react";
import { toggleFollow, toggleLike } from "@/actions/social";
import { Sheet } from "@/components/ui/overlay";
import { burst, haptic } from "@/lib/celebrate";
import { cn, compact } from "@/lib/format";

/** Like, or on runs and medals "Pongezi" (Swahili: congratulations) with a hand-heart. Same data either way. */
export function LikeButton({ postId, liked, likes, signedIn, pongezi }: { postId: number; liked: boolean; likes: number; signedIn: boolean; pongezi?: boolean }) {
  const Icon = pongezi ? HandHeart : Heart;
  const [state, setState] = useState({ liked, likes });
  const [pop, setPop] = useState(0);
  const [, start] = useTransition();
  const router = useRouter();
  const icon = useRef<HTMLSpanElement>(null);
  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={pongezi ? (state.liked ? "Take back pongezi" : "Give pongezi") : state.liked ? "Unlike" : "Like"}
      onClick={() => {
        if (!signedIn) return router.push("/login");
        const next = { liked: !state.liked, likes: state.likes + (state.liked ? -1 : 1) };
        if (next.liked) {
          setPop((p) => p + 1);
          haptic();
          burst(icon.current, { count: 9, spread: 46 });
        }
        setState(next);
        start(async () => {
          const now = await toggleLike(postId).catch(() => state.liked);
          if (now !== next.liked) setState(state);
        });
      }}
      className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white"
    >
      <span ref={icon} className={cn("glass-dark grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90", state.liked && "text-green")}>
        {/* Re-keyed on each like so the pop animation replays. */}
        <Icon key={pop} size={21} fill={state.liked && !pongezi ? "currentColor" : "none"} strokeWidth={2.2} className={pop ? "animate-heart-pop" : undefined} />
      </span>
      {pongezi && !state.likes ? "Pongezi" : compact(state.likes)}
    </button>
  );
}

export function ShareButton({ path, title, dark = true, className }: { path: string; title: string; dark?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  const message = `${title} · ${url}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(null);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copying is unavailable on this device. Try WhatsApp instead.");
    }
  }

  return (
    <>
      <button type="button" aria-label="Share" onClick={() => { setError(null); setOpen(true); }} className={cn("flex flex-col items-center gap-1 text-[11px] font-semibold", dark ? "text-white" : "text-ink", className)}>
        <span className={cn("grid h-11 w-11 place-items-center rounded-full", dark ? "glass-dark" : "bg-gray-100")}>
          {copied ? <Check size={19} strokeWidth={2.2} /> : <Share2 size={19} strokeWidth={2.2} />}
        </span>
        {copied ? "Copied" : "Share"}
      </button>
      {open && (
        <Sheet title="Share on Riadha" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="btn btn-accent btn-block">
              <MessageCircle size={17} /> Share to WhatsApp
            </a>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button type="button" onClick={async () => { await navigator.share({ title, url }).catch(() => {}); setOpen(false); }} className="btn btn-secondary btn-block">
                <Share2 size={17} /> More sharing options
              </button>
            )}
            <button type="button" onClick={copyLink} className="btn btn-ghost btn-block">
              {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Link copied" : "Copy link"}
            </button>
            {error && <p role="status" className="text-center text-[12px] text-danger">{error}</p>}
          </div>
        </Sheet>
      )}
    </>
  );
}

export function FollowButton({ userId, following, signedIn, className }: { userId: string; following: boolean; signedIn: boolean; className?: string }) {
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        if (!signedIn) return router.push("/login");
        if (!optimistic) {
          haptic();
          burst(e.currentTarget, { count: 8, spread: 50 });
        }
        start(async () => {
          setOptimistic(!optimistic);
          await toggleFollow(userId);
        });
      }}
      className={cn("btn btn-sm h-9 px-5", optimistic ? "btn-secondary" : "btn-accent", className)}
    >
      {optimistic ? "Following" : "Follow"}
    </button>
  );
}
