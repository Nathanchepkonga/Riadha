"use client";

import { useState, useTransition } from "react";
import { Check, LogOut, Plus } from "lucide-react";
import { joinCommunity, leaveCommunity } from "@/actions/communities";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/format";

/** Join (with a celebration) or leave a community. Owners can't leave, so they never see this. */
export function JoinButton({ communityId, joined, className, tone = "accent" }: { communityId: number; joined: boolean; className?: string; tone?: "accent" | "light" }) {
  const [on, setOn] = useState(joined);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (on) {
    return (
      <span className={cn("inline-flex flex-col items-start", className)}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Leave this community? You'll stop seeing its chat.")) return;
            start(async () => {
              setOn(false);
              await leaveCommunity(communityId).catch((e: Error) => {
                setOn(true);
                setError(e.message);
              });
            });
          }}
          className="btn btn-sm btn-ghost-light group"
        >
          <Check size={14} className="group-hover:hidden" />
          <LogOut size={14} className="hidden group-hover:block" />
          <span className="group-hover:hidden">Joined</span>
          <span className="hidden group-hover:inline">Leave</span>
        </button>
        {error && <span className="mt-1 text-[12px] text-white/70">{error}</span>}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        const at = e.currentTarget;
        start(async () => {
          setOn(true);
          celebrate(at);
          await joinCommunity(communityId).catch(() => setOn(false));
        });
      }}
      className={cn("btn btn-sm", tone === "accent" ? "btn-accent" : "btn-light", className)}
    >
      <Plus size={14} strokeWidth={3} /> Join
    </button>
  );
}
