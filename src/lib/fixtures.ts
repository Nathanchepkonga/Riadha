import "server-only";
import { and, asc, desc, eq, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { fixtures, kplClubs, players, playerStats } from "@/db/schema";

const home = alias(kplClubs, "home");
const away = alias(kplClubs, "away");

export async function listFixtures(opts: { gameweekId?: number; clubId?: number; results?: boolean }) {
  const where: SQL[] = [];
  if (opts.gameweekId) where.push(eq(fixtures.gameweekId, opts.gameweekId));
  if (opts.clubId) where.push(or(eq(fixtures.homeClubId, opts.clubId), eq(fixtures.awayClubId, opts.clubId))!);
  if (opts.results !== undefined) where.push(eq(fixtures.finished, opts.results));
  return db
    .select({ fixture: fixtures, home, away })
    .from(fixtures)
    .innerJoin(home, eq(home.id, fixtures.homeClubId))
    .innerJoin(away, eq(away.id, fixtures.awayClubId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(opts.results ? desc(fixtures.kickoff) : asc(fixtures.kickoff), asc(fixtures.id))
    .limit(opts.clubId ? 40 : 60);
}

export async function getFixture(id: number) {
  const [row] = await db
    .select({ fixture: fixtures, home, away })
    .from(fixtures)
    .innerJoin(home, eq(home.id, fixtures.homeClubId))
    .innerJoin(away, eq(away.id, fixtures.awayClubId))
    .where(eq(fixtures.id, id));
  if (!row) return null;
  const lines = await db
    .select({ stat: playerStats, player: players })
    .from(playerStats)
    .innerJoin(players, eq(players.id, playerStats.playerId))
    .where(eq(playerStats.fixtureId, id))
    .orderBy(desc(playerStats.points));
  return { ...row, lines };
}

/** The most recent gameweek with at least one finished match (the Results tab's default). */
export async function latestResultsGameweek() {
  const [row] = await db
    .select({ gw: fixtures.gameweekId })
    .from(fixtures)
    .where(eq(fixtures.finished, true))
    .orderBy(desc(fixtures.gameweekId))
    .limit(1);
  return row?.gw ?? null;
}
