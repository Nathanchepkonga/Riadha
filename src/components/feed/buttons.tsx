"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2 } from "lucide-react";
import { toggleFollow, toggleLike } from "@/actions/social";
import { burst, haptic } from "@/lib/celebrate";
import { cn, compact } from "@/lib/format";

export function LikeButton({ postId, liked, likes, signedIn }: { postId: number; liked: boolean; likes: number; signedIn: boolean }) {
  const [state, setState] = useState({ liked, likes });
  const [pop, setPop] = useState(0);
  const [, start] = useTransition();
  const router = useRouter();
  const icon = useRef<HTMLSpanElement>(null);
  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
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
        <Heart key={pop} size={21} fill={state.liked ? "currentColor" : "none"} strokeWidth={2.2} className={pop ? "animate-heart-pop" : undefined} />
      </span>
      {compact(state.likes)}
    </button>
  );
}

export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Share"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => {});
        } else {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
      className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white"
    >
      <span className="glass-dark grid h-11 w-11 place-items-center rounded-full">
        <Share2 size={19} strokeWidth={2.2} />
      </span>
      {copied ? "Copied" : "Share"}
    </button>
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
