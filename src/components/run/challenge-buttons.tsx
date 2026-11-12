"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Medal as MedalIcon, Share2 } from "lucide-react";
import { joinChallenge, leaveChallenge, shareMedal } from "@/actions/running";
import { celebrate, haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";

export function JoinChallengeButton({ id, joined, ended }: { id: number; joined: boolean; ended: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (joined) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Leave this challenge? Your progress is kept if you join again.")) return;
          start(async () => {
            await leaveChallenge(id);
            router.refresh();
          });
        }}
        className="btn btn-ghost btn-sm text-white/70"
      >
        Leave
      </button>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={pending || ended}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await joinChallenge(id).catch(() => ({ error: "Couldn't join. Check your connection." }));
            if ("error" in res) return setError(res.error);
            haptic(20);
            if (res.completed) celebrate();
            router.refresh();
          })
        }
        className={cn("btn btn-accent btn-lg", pending && "opacity-70")}
      >
        {ended ? "This challenge has ended" : pending ? "Joining…" : "Join the challenge"}
      </button>
      {error && <p className="mt-2 text-[13px] text-white/80">{error}</p>}
    </div>
  );
}

/** Puts the medal in the feed, then the page offers a medal reel. */
export function ShareMedalButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await shareMedal(id);
          if ("postId" in res) {
            celebrate();
            router.refresh();
          }
        })
      }
      className="btn btn-accent"
    >
      {pending ? <MedalIcon size={16} className="animate-live" /> : <Share2 size={16} />} Share my medal
    </button>
  );
}
