import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { entryGameweeks, gameweeks } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntry, getPlayerPool } from "@/lib/fantasy/data";
import { getCurrentGameweek, getEffectivePicks, playerGameweekStats } from "@/lib/fantasy/engine";
import { scoreLineup } from "@/lib/fantasy/lineup";
import { CountUp } from "@/components/motion/count-up";
import { Bench, Pitch, PitchRow, PlayerChip } from "@/components/fantasy/pitch";

export const metadata: Metadata = { title: "Points" };

export default async function PointsPage({ params }: PageProps<"/fantasy/points/[gw]">) {
  const gwId = Number((await params).gw);
  const user = await requireUser();
  const [entry, current, [gw]] = await Promise.all([
    getEntry(user.id),
    getCurrentGameweek(db),
    db.select().from(gameweeks).where(eq(gameweeks.id, gwId)),
  ]);
  if (!entry || !gw || !current || gwId > current.id) notFound();
  if (gwId < entry.startGameweekId) {
    return (
      <div className="p-6 text-center">
        <p className="h4">You joined in GW{entry.startGameweekId}</p>
        <Link href={`/fantasy/points/${entry.startGameweekId}`} className="btn btn-primary mt-4">See GW{entry.startGameweekId}</Link>
      </div>
    );
  }

  const [{ picks }, stats, pool, [row], [agg]] = await Promise.all([
    getEffectivePicks(db, entry.id, gwId),
    playerGameweekStats(db, gwId),
    getPlayerPool(),
    db.select().from(entryGameweeks).where(and(eq(entryGameweeks.entryId, entry.id), eq(entryGameweeks.gameweekId, gwId))),
    db
      .select({ avg: sql<number>`coalesce(round(avg(${entryGameweeks.points})),0)::int`, top: sql<number>`coalesce(max(${entryGameweeks.points}),0)::int` })
      .from(entryGameweeks)
      .where(eq(entryGameweeks.gameweekId, gwId)),
  ]);
  const byId = new Map(pool.map((p) => [p.id, p]));
  const scored = scoreLineup(picks, (id) => byId.get(id)?.position ?? "MID", (id) => stats.get(id), gw.finished);
  const starters = scored.picks.filter((p) => p.starter);
  const bench = scored.picks.filter((p) => !p.starter).sort((a, b) => a.slot - b.slot);
  const total = row?.points ?? scored.total - (row?.hits ?? 0);

  const chip = (p: (typeof scored.picks)[number]) => {
    const pl = byId.get(p.playerId)!;
    const shown = p.starter ? p.points * p.multiplier : p.points;
    return (
      <PlayerChip
        key={p.playerId}
        name={pl.name}
        primary={pl.primary}
        secondary={pl.secondary}
        captain={p.isCaptain}
        vice={p.isVice}
        sub={shown}
        subTone={p.starter ? "accent" : "dark"}
        badge={
          p.subbedIn ? <span className="absolute -left-1 top-0 rounded bg-green px-1 text-[8px] font-bold text-navy">IN</span> : p.subbedOut ? <span className="absolute -left-1 top-0 rounded bg-white px-1 text-[8px] font-bold text-navy">OUT</span> : null
        }
      />
    );
  };

  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-1">
        <Link aria-label="Previous gameweek" href={`/fantasy/points/${gwId - 1}`} className={gwId <= entry.startGameweekId ? "pointer-events-none opacity-30" : ""}>
          <ChevronLeft />
        </Link>
        <div className="text-center">
          <p className="kicker">{entry.teamName}</p>
          <h1 className="h3">Gameweek {gwId}</h1>
          <p className="text-xs text-muted">{gw.finished ? "Final" : "Live · provisional"}</p>
        </div>
        <Link aria-label="Next gameweek" href={`/fantasy/points/${gwId + 1}`} className={gwId >= current.id ? "pointer-events-none opacity-30" : ""}>
          <ChevronRight />
        </Link>
      </div>

      <div className="relative mt-4 grid grid-cols-[1.3fr_1fr_1fr] items-end gap-2 overflow-hidden rounded-3xl bg-navy p-4 text-white">
        <span className="absolute -right-10 top-0 h-full w-12 -skew-x-[28deg] bg-green/90" aria-hidden />
        <div className="relative">
          <p className="kicker text-white/60">Your points</p>
          <CountUp to={total} className="block text-[76px] font-bold leading-[0.85] tracking-[-0.06em] text-green tabular" />
        </div>
        <div className="relative">
          <p className="kicker text-white/60">Average</p>
          <CountUp to={agg?.avg ?? 0} delay={200} className="block text-[40px] font-bold leading-[0.9] tracking-[-0.05em] tabular" />
        </div>
        <div className="relative">
          <p className="kicker text-white/60">Highest</p>
          <CountUp to={agg?.top ?? 0} delay={400} className="block text-[40px] font-bold leading-[0.9] tracking-[-0.05em] tabular" />
        </div>
      </div>
      {!!row?.hits && <p className="mt-2 px-1 text-sm text-danger">Includes a −{row.hits} pt transfer hit.</p>}

      <Pitch className="mt-4 min-h-[430px]">
        {(["GK", "DEF", "MID", "FWD"] as const).map((pos) => (
          <PitchRow key={pos}>{starters.filter((p) => byId.get(p.playerId)?.position === pos).map(chip)}</PitchRow>
        ))}
      </Pitch>
      <Bench title={`Bench · ${scored.benchPoints} pts`}>{bench.map(chip)}</Bench>
    </div>
  );
}
