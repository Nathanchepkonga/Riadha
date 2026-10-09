"use client";

import { useTransition } from "react";
import { CircleStop, Pause, Play } from "lucide-react";
import { setBusinessListed, setCampaignStatus } from "@/actions/market";

/** Pause / resume / end controls on a campaign the owner manages. */
export function CampaignControls({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  const run = (next: "active" | "paused" | "ended", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      await setCampaignStatus(id, next).catch((e: Error) => window.alert(e.message));
    });
  };
  return (
    <div className="flex gap-1.5">
      {status === "active" && (
        <button type="button" disabled={pending} onClick={() => run("paused")} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-semibold hover:bg-gray-200">
          <Pause size={12} /> Pause
        </button>
      )}
      {status === "paused" && (
        <button type="button" disabled={pending} onClick={() => run("active")} className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-[12px] font-semibold text-white">
          <Play size={12} /> Resume
        </button>
      )}
      {(status === "active" || status === "paused" || status === "pending") && (
        <button type="button" disabled={pending} onClick={() => run("ended", "End this ad? It stops showing and can't be restarted.")} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-danger hover:bg-danger/10">
          <CircleStop size={12} /> End
        </button>
      )}
    </div>
  );
}

/** Hide or re-list a business. */
export function ListingToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (active && !window.confirm("Hide this listing? It and its ads stop showing until you re-list it.")) return;
        start(async () => {
          await setBusinessListed(id, !active);
        });
      }}
      className="rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-semibold hover:bg-gray-200"
    >
      {active ? "Hide listing" : "Re-list"}
    </button>
  );
}
