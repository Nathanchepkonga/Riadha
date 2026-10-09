"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Star, X } from "lucide-react";
import { rsvp } from "@/actions/communities";
import { celebrate, haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";

type Status = "going" | "interested" | null;

/** Going / Interested / Can't go, with live counts and a capacity bar. */
export function RsvpControl({ eventId, status, going, interested, capacity, past }: { eventId: number; status: Status; going: number; interested: number; capacity: number | null; past: boolean }) {
  const [mine, setMine] = useState<Status>(status);
  const [counts, setCounts] = useState({ going, interested });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const full = capacity !== null && counts.going >= capacity && mine !== "going";

  const choose = (next: Status, at?: HTMLElement) => {
    if (next === mine) next = null;
    const before = { mine, counts };
    const c = { ...counts };
    if (mine) c[mine]--;
    if (next) c[next]++;
    setMine(next);
    setCounts(c);
    setError(null);
    if (next === "going") celebrate(at);
    else haptic();
    start(async () => {
      const res = await rsvp(eventId, next).catch(() => ({ error: "Couldn't save your RSVP." }));
      if (res.error) {
        setError(res.error);
        setMine(before.mine);
        setCounts(before.counts);
      }
    });
  };

  if (past) return <p className="rounded-xl bg-gray-100 px-4 py-3 text-[14px] text-muted">This event has finished. {counts.going} went.</p>;

  return (
    <div>
      {capacity !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-[12px] font-semibold text-muted">
            <span>{counts.going} going</span>
            <span>{Math.max(0, capacity - counts.going)} spots left</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#8DD63A,#B7F34A)] transition-[width] duration-700 ease-[var(--ease-snap)]" style={{ width: `${Math.min(100, (counts.going / capacity) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending || full}
          aria-pressed={mine === "going"}
          onClick={(e) => choose("going", e.currentTarget)}
          className={cn("btn", mine === "going" ? "btn-accent" : "btn-primary")}
        >
          <CalendarCheck size={16} /> {mine === "going" ? "You're going" : full ? "Full" : "Going"}
        </button>
        <button type="button" disabled={pending} aria-pressed={mine === "interested"} onClick={() => choose("interested")} className={cn("btn", mine === "interested" ? "btn-cobalt" : "btn-secondary")}>
          <Star size={16} fill={mine === "interested" ? "currentColor" : "none"} /> Interested
        </button>
      </div>
      {mine && (
        <button type="button" disabled={pending} onClick={() => choose(null)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
          <X size={14} /> Can&apos;t make it
        </button>
      )}
      <p className="mt-2 text-[12px] text-muted">
        {counts.going} going · {counts.interested} interested
      </p>
      {error && <p role="alert" className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
