// Server-side fantasy engine. Takes the db as an argument so the seed script can reuse it.
import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  entryGameweeks,
  entryPicks,
  fantasyEntries,
  fixtures,
  gameweeks,
  players,
  playerStats,
} from "@/db/schema";
import { scoreLineup, type Pick, type PlayerGw } from "./lineup";
import { transferLedger, type Pos } from "./rules";
import { awardBonus, basePoints, totalPoints } from "./scoring";

export async function getNextGameweek(db: DB, now = new Date()) {
  const [gw] = await db
    .select()
    .from(gameweeks)
    .where(gt(gameweeks.deadline, now))
    .orderBy(asc(gameweeks.deadline))
    .limit(1);
  return gw ?? null;
}

/** The latest gameweek whose deadline has passed (in progress or finished). */
export async function getCurrentGameweek(db: DB, now = new Date()) {
  const [gw] = await db
    .select()
    .from(gameweeks)
    .where(lte(gameweeks.deadline, now))
    .orderBy(desc(gameweeks.deadline))
    .limit(1);
  return gw ?? null;
}

/** Picks for a gameweek, inheriting from the latest earlier gameweek when none were saved. */
export async function getEffectivePicks(db: DB, entryId: number, gwId: number) {
  const [latest] = await db
    .select({ gw: sql<number>`max(${entryPicks.gameweekId})` })
    .from(entryPicks)
    .where(and(eq(entryPicks.entryId, entryId), lte(entryPicks.gameweekId, gwId)));
  if (!latest?.gw) return { sourceGw: null as number | null, picks: [] as Pick[] };
  const rows = await db
    .select({
      slot: entryPicks.slot,
      playerId: entryPicks.playerId,
      isCaptain: entryPicks.isCaptain,
      isVice: entryPicks.isVice,
    })
    .from(entryPicks)
    .where(and(eq(entryPicks.entryId, entryId), eq(entryPicks.gameweekId, latest.gw)))
    .orderBy(asc(entryPicks.slot));
  return { sourceGw: latest.gw, picks: rows };
}

/** Makes sure editable picks exist for the next gameweek by copying the last saved lineup forward. */
export async function ensurePicksFor(db: DB, entryId: number, gwId: number) {
  const { sourceGw, picks } = await getEffectivePicks(db, entryId, gwId);
  if (sourceGw === null || sourceGw === gwId) return picks;
  await db
    .insert(entryPicks)
    .values(picks.map((p) => ({ ...p, entryId, gameweekId: gwId })))
    .onConflictDoNothing();
  return picks;
}

/** Transfers made in each gameweek = players in that week's squad who weren't in the previous one. */
export async function transferCounts(db: DB, entryId: number, startGw: number, uptoGw: number) {
  const rows = await db
    .select({ gw: entryPicks.gameweekId, playerId: entryPicks.playerId })
    .from(entryPicks)
    .where(and(eq(entryPicks.entryId, entryId), lte(entryPicks.gameweekId, uptoGw)));
  return countTransfers(rows, startGw, uptoGw);
}

function countTransfers(rows: { gw: number; playerId: number }[], startGw: number, uptoGw: number) {
  const byGw = new Map<number, Set<number>>();
  for (const r of rows) {
    if (!byGw.has(r.gw)) byGw.set(r.gw, new Set());
    byGw.get(r.gw)!.add(r.playerId);
  }
  const made = new Map<number, number>();
  let prev: Set<number> | undefined;
  for (let gw = startGw; gw <= uptoGw; gw++) {
    const squad = byGw.get(gw) ?? prev;
    if (gw > startGw && squad && prev) {
      let n = 0;
      for (const id of squad) if (!prev.has(id)) n++;
      made.set(gw, n);
    }
    prev = squad;
  }
  return made;
}

export async function getTransferState(db: DB, entry: { id: number; startGameweekId: number }, gwId: number) {
  const made = await transferCounts(db, entry.id, entry.startGameweekId, gwId);
  const ledger = transferLedger(entry.startGameweekId, gwId, made);
  return ledger.get(gwId) ?? { free: Infinity, made: 0, hits: 0 };
}

/** Points and minutes per player for a gameweek (sums double gameweeks). */
export async function playerGameweekStats(db: DB, gwId: number) {
  const rows = await db
    .select({
      playerId: playerStats.playerId,
      points: sql<number>`sum(${playerStats.points})::int`,
      minutes: sql<number>`sum(${playerStats.minutes})::int`,
    })
    .from(playerStats)
    .where(eq(playerStats.gameweekId, gwId))
    .groupBy(playerStats.playerId);
  return new Map<number, PlayerGw>(rows.map((r) => [r.playerId, { points: r.points, minutes: r.minutes }]));
}

/** Recomputes every manager's score for one gameweek. Idempotent: safe to run after any stat correction. */
export async function recalculateGameweek(db: DB, gwId: number) {
  const [gw] = await db.select().from(gameweeks).where(eq(gameweeks.id, gwId));
  if (!gw) throw new Error(`Gameweek ${gwId} not found`);

  const stats = await playerGameweekStats(db, gwId);
  const pos = new Map<number, Pos>(
    (await db.select({ id: players.id, position: players.position }).from(players)).map((p) => [p.id, p.position]),
  );
  const entries = await db
    .select({ id: fantasyEntries.id, startGw: fantasyEntries.startGameweekId })
    .from(fantasyEntries)
    .where(lte(fantasyEntries.startGameweekId, gwId));
  if (entries.length === 0) return 0;

  const allPicks = await db
    .select()
    .from(entryPicks)
    .where(and(inArray(entryPicks.entryId, entries.map((e) => e.id)), lte(entryPicks.gameweekId, gwId)));
  const byEntry = new Map<number, typeof allPicks>();
  for (const p of allPicks) {
    if (!byEntry.has(p.entryId)) byEntry.set(p.entryId, []);
    byEntry.get(p.entryId)!.push(p);
  }

  const results: (typeof entryGameweeks.$inferInsert)[] = [];
  for (const entry of entries) {
    const picks = byEntry.get(entry.id) ?? [];
    const sourceGw = Math.max(0, ...picks.map((p) => p.gameweekId));
    if (!sourceGw) continue;
    const lineup = picks.filter((p) => p.gameweekId === sourceGw);
    const scored = scoreLineup(lineup, (id) => pos.get(id) ?? "MID", (id) => stats.get(id), gw.finished);
    const made = countTransfers(
      picks.map((p) => ({ gw: p.gameweekId, playerId: p.playerId })),
      entry.startGw,
      gwId,
    );
    const ledger = transferLedger(entry.startGw, gwId, made).get(gwId)!;
    results.push({
      entryId: entry.id,
      gameweekId: gwId,
      rawPoints: scored.total,
      hits: ledger.hits,
      points: scored.total - ledger.hits,
      benchPoints: scored.benchPoints,
      transfersMade: ledger.made,
    });
  }

  for (let i = 0; i < results.length; i += 500) {
    await db
      .insert(entryGameweeks)
      .values(results.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [entryGameweeks.entryId, entryGameweeks.gameweekId],
        set: {
          rawPoints: sql`excluded.raw_points`,
          hits: sql`excluded.hits`,
          points: sql`excluded.points`,
          benchPoints: sql`excluded.bench_points`,
          transfersMade: sql`excluded.transfers_made`,
        },
      });
  }
  return results.length;
}

export type StatInput = {
  playerId: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  penSaved: number;
  penMissed: number;
  yellow: number;
  red: number;
  ownGoals: number;
};

/**
 * Saves a match result and its player stat lines. Clean sheets and goals conceded come from the
 * score; bonus goes to the three best base scores in the match. Then rescoring runs for the week.
 */
export async function saveFixtureResult(
  db: DB,
  fixtureId: number,
  input: { homeScore: number; awayScore: number; finished: boolean; rows: StatInput[] },
  opts: { recalculate?: boolean } = {},
) {
  const [fx] = await db.select().from(fixtures).where(eq(fixtures.id, fixtureId));
  if (!fx) throw new Error("Fixture not found");
  const squad = await db
    .select({ id: players.id, clubId: players.clubId, position: players.position })
    .from(players)
    .where(inArray(players.clubId, [fx.homeClubId, fx.awayClubId]));
  const info = new Map(squad.map((p) => [p.id, p]));

  const lines = input.rows
    .filter((r) => info.has(r.playerId) && r.minutes > 0)
    .map((r) => {
      const p = info.get(r.playerId)!;
      const conceded = p.clubId === fx.homeClubId ? input.awayScore : input.homeScore;
      const line = {
        ...r,
        bonus: 0,
        goalsConceded: conceded,
        cleanSheet: r.minutes >= 60 && conceded === 0,
      };
      return { line, pos: p.position, base: basePoints(p.position, line), minutes: r.minutes };
    });
  const bonus = awardBonus(lines);

  await db.transaction(async (tx) => {
    await tx.delete(playerStats).where(eq(playerStats.fixtureId, fixtureId));
    if (lines.length) {
      await tx.insert(playerStats).values(
        lines.map((l) => {
          const line = { ...l.line, bonus: bonus.get(l) ?? 0 };
          return {
            ...line,
            fixtureId,
            gameweekId: fx.gameweekId,
            points: totalPoints(l.pos, line),
          };
        }),
      );
    }
    await tx
      .update(fixtures)
      .set({ homeScore: input.homeScore, awayScore: input.awayScore, finished: input.finished })
      .where(eq(fixtures.id, fixtureId));
  });

  if (opts.recalculate !== false) await recalculateGameweek(db, fx.gameweekId);
}
