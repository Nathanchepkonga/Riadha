import Link from "next/link";
import { CalendarDays, HeartHandshake, UsersRound } from "lucide-react";
import type { Challenge } from "@/db/schema";
import { cn, countdown, formatDate } from "@/lib/format";
import { km, raceTime } from "@/lib/running/format";
import { Medal } from "./medal";

type Entry = { progressM: number; completedAt: Date | null; bestMs: number | null } | null;

/** "Run 5 km in one go", "Run 100 km in total", "Run 5 km in under 25:00". */
export function goalText(c: Pick<Challenge, "kind" | "goalM" | "maxMs" | "sport">) {
  const verb = c.sport === "ride" ? "Ride" : c.sport === "walk" ? "Walk" : "Run";
  if (c.kind === "total") return `${verb} ${km(c.goalM).replace(/\.0+$/, "")} km in total`;
  return c.maxMs ? `${verb} ${km(c.goalM).replace(/\.0+$/, "")} km in under ${raceTime(c.maxMs)}` : `${verb} ${km(c.goalM).replace(/\.0+$/, "")} km in one go`;
}

/** Challenge windows end at midnight, so the last day that counts is the day before. */
export const lastDay = (endsAt: Date) => new Date(endsAt.getTime() - 1);

export function windowText(c: Pick<Challenge, "startsAt" | "endsAt">, now = Date.now()) {
  if (c.startsAt.getTime() > now) return `Starts ${formatDate(c.startsAt, { day: "numeric", month: "short" })}`;
  if (!c.endsAt) return "Always open";
  if (c.endsAt.getTime() < now) return `Ended ${formatDate(lastDay(c.endsAt), { day: "numeric", month: "short" })}`;
  return `${countdown(c.endsAt, now)} left`;
}

/** Progress as a slanted bar (brand diagonal). */
export function ProgressBar({ value, dark, className }: { value: number; dark?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className={cn("block h-2.5 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-gray-200", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span className="block h-full -skew-x-[37.57deg] rounded-full bg-green transition-[width] duration-700" style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }} />
    </span>
  );
}

export function ChallengeCard({ c, entry, participants, sponsor, compact }: { c: Challenge; entry: Entry; participants: number; sponsor?: { name: string } | null; compact?: boolean }) {
  const done = !!entry?.completedAt;
  const progress = entry ? Math.min(1, entry.progressM / c.goalM) : 0;
  return (
    <Link href={`/challenges/${c.slug}`} className={cn("card pressable relative flex overflow-hidden", compact ? "w-[250px] shrink-0 flex-col gap-3 p-4" : "items-center gap-4 p-4")}>
      <Medal goalM={c.goalM} accent={c.accent} locked={!done} size={compact ? 52 : 58} />
      <span className="min-w-0 flex-1">
        {(c.occasion || sponsor || c.cause) && (
          <span className="mb-0.5 flex items-center gap-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-cobalt">
            {c.cause && <HeartHandshake size={12} />}
            {c.occasion ?? (sponsor ? `With ${sponsor.name}` : "For a cause")}
          </span>
        )}
        <span className="block truncate text-[16px] font-bold tracking-[-0.01em]">{c.title}</span>
        <span className="block truncate text-[13px] text-muted">{goalText(c)}</span>
        {entry ? (
          <span className="mt-2 block">
            <ProgressBar value={done ? 1 : progress} />
            <span className="mt-1 flex justify-between text-[11px] text-muted tabular">
              <span className={done ? "font-semibold text-ink" : undefined}>{done ? "Finished 🎉" : `${km(entry.progressM)} / ${km(c.goalM)} km`}</span>
              <span>{windowText(c)}</span>
            </span>
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {windowText(c)}</span>
            <span className="inline-flex items-center gap-1"><UsersRound size={12} /> {participants}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
