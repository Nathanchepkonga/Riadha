import "server-only";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cache } from "react";
import { db } from "@/db";
import {
  entryGameweeks,
  fantasyEntries,
  fixtures,
  gameweeks,
  kplClubs,
  leagueMembers,
  leagues,
  players,
  playerStats,
  users,
} from "@/db/schema";
import { ensurePicksFor, getCurrentGameweek, getEffectivePicks, getNextGameweek, getTransferState } from "./engine";
import type { Pos } from "./rules";

export type PoolPlayer = {
  id: number;
  name: string;
  position: Pos;
  price: number;
  clubId: number;
  club: string;
  clubName: string;
  primary: string;
  secondary: string;
  totalPoints: number;
  lastPoints: number;
  next: { opp: string; home: boolean; fdr: number } | null;
};

/** Every player with season points, last-gameweek points and next opponent (with a 1–5 difficulty). */
export const getPlayerPool = cache(async (): Promise<PoolPlayer[]> => {
  const [next, current] = await Promise.all([getNextGameweek(db), getCurrentGameweek(db)]);
  const [rows, totals, last, table, nextFixtures] = await Promise.all([
    db
      .select({ p: players, c: kplClubs })
      .from(players)
      .innerJoin(kplClubs, eq(kplClubs.id, players.clubId))
      .where(eq(players.available, true)),
    db
      .select({ id: playerStats.playerId, pts: sql<number>`sum(${playerStats.points})::int` })
      .from(playerStats)
      .groupBy(playerStats.playerId),
    current
      ? db
          .select({ id: playerStats.playerId, pts: sql<number>`sum(${playerStats.points})::int` })
          .from(playerStats)
          .where(eq(playerStats.gameweekId, current.id))
          .groupBy(playerStats.playerId)
      : [],
    getLeagueTable(),
    next ? db.select().from(fixtures).where(eq(fixtures.gameweekId, next.id)) : [],
  ]);

  const total = new Map(totals.map((r) => [r.id, r.pts]));
  const lastPts = new Map(last.map((r) => [r.id, r.pts]));
  const short = new Map(rows.map((r) => [r.c.id, r.c.shortName]));
  // Difficulty from the opponent's league position: top quintile = 5.
  const fdrOf = new Map(table.map((t, i) => [t.clubId, 5 - Math.floor((i / table.length) * 5)]));
  const nextFor = new Map<number, PoolPlayer["next"]>();
  for (const f of nextFixtures) {
    nextFor.set(f.homeClubId, { opp: short.get(f.awayClubId) ?? "?", home: true, fdr: fdrOf.get(f.awayClubId) ?? 3 });
    nextFor.set(f.awayClubId, { opp: short.get(f.homeClubId) ?? "?", home: false, fdr: fdrOf.get(f.homeClubId) ?? 3 });
  }

  return rows.map(({ p, c }) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    price: p.price,
    clubId: c.id,
    club: c.shortName,
    clubName: c.name,
    primary: c.primaryColor,
    secondary: c.secondaryColor,
    totalPoints: total.get(p.id) ?? 0,
    lastPoints: lastPts.get(p.id) ?? 0,
    next: nextFor.get(c.id) ?? null,
  }));
});

/** KPL table from finished fixtures. */
export const getLeagueTable = cache(async () => {
  const [clubs, played] = await Promise.all([
    db.select().from(kplClubs),
    db.select().from(fixtures).where(eq(fixtures.finished, true)),
  ]);
  const rows = new Map(clubs.map((c) => [c.id, { clubId: c.id, club: c, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const f of played) {
    const h = rows.get(f.homeClubId)!;
    const a = rows.get(f.awayClubId)!;
    const hs = f.homeScore ?? 0;
    const as = f.awayScore ?? 0;
    h.p++; a.p++;
    h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    if (hs > as) { h.w++; a.l++; h.pts += 3; }
    else if (hs < as) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
});

export async function getEntry(userId: string) {
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, userId));
  return entry ?? null;
}

/** Everything the "My XI" screen needs. */
export async function getManagerHome(userId: string) {
  const [next, current, entry] = await Promise.all([getNextGameweek(db), getCurrentGameweek(db), getEntry(userId)]);
  if (!entry) return { next, current, entry: null };

  const picks = next ? await ensurePicksFor(db, entry.id, next.id) : (await getEffectivePicks(db, entry.id, current?.id ?? 1)).picks;
  const [transfer, summary, gwRow, gwAvg] = await Promise.all([
    next ? getTransferState(db, entry, next.id) : null,
    getOverallRank(entry.id),
    current
      ? db.select().from(entryGameweeks).where(and(eq(entryGameweeks.entryId, entry.id), eq(entryGameweeks.gameweekId, current.id))).then((r) => r[0] ?? null)
      : null,
    current
      ? db.select({ avg: sql<number>`coalesce(round(avg(${entryGameweeks.points})),0)::int`, top: sql<number>`coalesce(max(${entryGameweeks.points}),0)::int` }).from(entryGameweeks).where(eq(entryGameweeks.gameweekId, current.id)).then((r) => r[0])
      : null,
  ]);
  return { next, current, entry, picks, transfer, summary, gwRow, gwAvg };
}

export async function getOverallRank(entryId: number) {
  const rows = await db.execute<{ total: number; rank: number; managers: number }>(sql`
    with totals as (
      select e.id, coalesce(sum(g.points), 0)::int as total
      from ${fantasyEntries} e left join ${entryGameweeks} g on g.entry_id = e.id
      group by e.id
    ), ranked as (
      select id, total, rank() over (order by total desc)::int as rank, count(*) over ()::int as managers from totals
    )
    select total, rank, managers from ranked where id = ${entryId}
  `);
  return rows[0] ?? { total: 0, rank: 0, managers: 0 };
}

/** Standings for a mini-league, or the overall league when leagueId is null. */
export async function getStandings(leagueId: number | null, gwId: number | null, limit = 100) {
  const member = leagueId === null ? sql`true` : sql`e.id in (select entry_id from ${leagueMembers} where league_id = ${leagueId})`;
  const rows = await db.execute<{
    entry_id: number;
    team_name: string;
    display_name: string;
    handle: string;
    total: number;
    gw: number;
    rank: number;
  }>(sql`
    select e.id as entry_id, e.team_name, u.display_name, u.handle,
      coalesce(sum(g.points), 0)::int as total,
      coalesce(sum(g.points) filter (where g.gameweek_id = ${gwId ?? -1}), 0)::int as gw,
      rank() over (order by coalesce(sum(g.points), 0) desc)::int as rank
    from ${fantasyEntries} e
    join ${users} u on u.id = e.user_id
    left join ${entryGameweeks} g on g.entry_id = e.id
    where ${member}
    group by e.id, u.display_name, u.handle
    order by total desc, e.id asc
    limit ${limit}
  `);
  return [...rows];
}

export async function getMyLeagues(entryId: number) {
  return db
    .select({ id: leagues.id, name: leagues.name, code: leagues.code, ownerId: leagues.ownerId, members: sql<number>`(select count(*)::int from league_members m where m.league_id = ${leagues.id})` })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .where(eq(leagueMembers.entryId, entryId))
    .orderBy(asc(leagues.id));
}

export async function getGameweekFixtures(gwId: number) {
  const home = alias(kplClubs, "home");
  const away = alias(kplClubs, "away");
  return db
    .select({ fixture: fixtures, home, away })
    .from(fixtures)
    .innerJoin(home, eq(home.id, fixtures.homeClubId))
    .innerJoin(away, eq(away.id, fixtures.awayClubId))
    .where(eq(fixtures.gameweekId, gwId))
    .orderBy(asc(fixtures.kickoff), asc(fixtures.id));
}

export async function listGameweeksUpTo(gwId: number) {
  return db.select().from(gameweeks).where(lte(gameweeks.id, gwId)).orderBy(asc(gameweeks.id));
}
