import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { fixtures, kplClubs, players, playerStats } from "@/db/schema";
import { formatKickoff } from "@/lib/format";
import { StatSheet } from "./stat-sheet";

export const metadata: Metadata = { title: "Match stats · Admin" };

export default async function FixtureAdmin({ params }: PageProps<"/admin/fixtures/[id]">) {
  const id = Number((await params).id);
  const home = alias(kplClubs, "home");
  const away = alias(kplClubs, "away");
  const [row] = await db
    .select({ f: fixtures, home, away })
    .from(fixtures)
    .innerJoin(home, eq(home.id, fixtures.homeClubId))
    .innerJoin(away, eq(away.id, fixtures.awayClubId))
    .where(eq(fixtures.id, id));
  if (!row) notFound();

  const [squad, stats] = await Promise.all([
    db.select().from(players).where(inArray(players.clubId, [row.home.id, row.away.id])).orderBy(asc(players.position), asc(players.id)),
    db.select().from(playerStats).where(eq(playerStats.fixtureId, id)),
  ]);
  const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const toRow = (p: (typeof squad)[number]) => {
    const s = stats.find((x) => x.playerId === p.id);
    return {
      id: p.id,
      name: p.name,
      position: p.position,
      points: s?.points ?? null,
      bonus: s?.bonus ?? 0,
      stat: {
        playerId: p.id,
        minutes: s?.minutes ?? 0,
        goals: s?.goals ?? 0,
        assists: s?.assists ?? 0,
        saves: s?.saves ?? 0,
        penSaved: s?.penSaved ?? 0,
        penMissed: s?.penMissed ?? 0,
        yellow: s?.yellow ?? 0,
        red: s?.red ?? 0,
        ownGoals: s?.ownGoals ?? 0,
      },
    };
  };
  const side = (clubId: number) => squad.filter((p) => p.clubId === clubId).sort((a, b) => posOrder[a.position] - posOrder[b.position]).map(toRow);

  return (
    <div>
      <Link href={`/admin/gameweeks/${row.f.gameweekId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> GW{row.f.gameweekId}
      </Link>
      <h1 className="mt-1 h2">
        {row.home.shortName} v {row.away.shortName}
      </h1>
      <p className="text-sm text-muted">{row.home.name} v {row.away.name} · {formatKickoff(row.f.kickoff)}</p>
      <StatSheet
        fixtureId={id}
        homeName={row.home.name}
        awayName={row.away.name}
        initial={{ homeScore: row.f.homeScore ?? 0, awayScore: row.f.awayScore ?? 0, finished: row.f.finished }}
        home={side(row.home.id)}
        away={side(row.away.id)}
      />
    </div>
  );
}
