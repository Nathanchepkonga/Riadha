import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, min, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as s from "@/db/schema";
import { COUNTIES } from "@/lib/constants";
import { countyTotals, groupRunSnapshot, isMinor } from "./engine";
import { weekStartOf } from "./track";

const runner = {
  id: s.users.id,
  handle: s.users.handle,
  displayName: s.users.displayName,
  avatarUrl: s.users.avatarUrl,
  role: s.users.role,
  verified: s.users.verified,
  county: s.users.county,
  dateOfBirth: s.users.dateOfBirth,
};

/** Columns safe to show anyone (never the track). */
export const activityCard = {
  id: s.activities.id,
  userId: s.activities.userId,
  sport: s.activities.sport,
  source: s.activities.source,
  title: s.activities.title,
  startedAt: s.activities.startedAt,
  distanceM: s.activities.distanceM,
  movingS: s.activities.movingS,
  elapsedS: s.activities.elapsedS,
  elevationGainM: s.activities.elevationGainM,
  splits: s.activities.splits,
  routeArt: s.activities.routeArt,
  profile: s.activities.profile,
  device: s.activities.device,
  isPrivate: s.activities.isPrivate,
  flag: s.activities.flag,
  eventId: s.activities.eventId,
};
export type ActivityCard = Pick<s.Activity, keyof typeof activityCard>;

/** One activity with its runner, post engagement, best efforts and group run. Null if the viewer can't see it. */
export async function getActivity(id: number, viewerId: string, isAdmin = false) {
  const [row] = await db
    .select({
      a: activityCard,
      user: runner,
      postId: s.posts.id,
      likes: sql<number>`(select count(*)::int from post_likes pl where pl.post_id = ${s.posts.id})`,
      liked: sql<boolean>`exists(select 1 from post_likes pl where pl.post_id = ${s.posts.id} and pl.user_id = ${viewerId})`,
      comments: sql<number>`(select count(*)::int from post_comments pc where pc.post_id = ${s.posts.id})`,
      videoUrl: s.posts.mediaUrl,
      posterUrl: s.posts.posterUrl,
      videoId: s.posts.videoId,
      event: { id: s.communityEvents.id, title: s.communityEvents.title },
      community: { slug: s.communities.slug, name: s.communities.name },
    })
    .from(s.activities)
    .innerJoin(s.users, eq(s.users.id, s.activities.userId))
    .leftJoin(s.posts, eq(s.posts.activityId, s.activities.id))
    .leftJoin(s.communityEvents, eq(s.communityEvents.id, s.activities.eventId))
    .leftJoin(s.communities, eq(s.communities.id, s.communityEvents.communityId))
    .where(eq(s.activities.id, id));
  if (!row) return null;
  const own = row.user.id === viewerId;
  if (row.a.isPrivate && !own && !isAdmin) return null;
  const efforts = await db.select().from(s.bestEfforts).where(eq(s.bestEfforts.activityId, id));
  const pongezi = row.postId
    ? await db
        .select({ handle: s.users.handle, displayName: s.users.displayName, avatarUrl: s.users.avatarUrl })
        .from(s.postLikes)
        .innerJoin(s.users, eq(s.users.id, s.postLikes.userId))
        .where(eq(s.postLikes.postId, row.postId))
        .orderBy(desc(s.postLikes.createdAt))
        .limit(12)
    : [];
  return { ...row, own, efforts, pongezi, minor: isMinor(row.user) };
}

export async function recentActivities(userId: string, opts: { own: boolean; limit?: number; offset?: number }) {
  return db
    .select(activityCard)
    .from(s.activities)
    .where(and(eq(s.activities.userId, userId), opts.own ? undefined : eq(s.activities.isPrivate, false)))
    .orderBy(desc(s.activities.startedAt))
    .limit(opts.limit ?? 10)
    .offset(opts.offset ?? 0);
}

export type LeagueScope = "overall" | "following" | "county" | "crew";
export type LeagueOrder = "points" | "distance";

/** A weekly Run League table, plus the viewer's own row if they're outside the shown rows. */
export async function leagueTable(opts: { weekStart: string; scope: LeagueScope; order: LeagueOrder; viewerId: string; county?: string | null; communityId?: number; limit?: number }) {
  const where: SQL[] = [eq(s.runWeeks.weekStart, opts.weekStart)];
  if (opts.scope === "following") {
    where.push(or(eq(s.runWeeks.userId, opts.viewerId), inArray(s.runWeeks.userId, db.select({ id: s.follows.followeeId }).from(s.follows).where(eq(s.follows.followerId, opts.viewerId))))!);
  }
  if (opts.scope === "county") where.push(eq(s.users.county, opts.county ?? "—"));
  if (opts.scope === "crew" && opts.communityId) {
    where.push(inArray(s.runWeeks.userId, db.select({ id: s.communityMembers.userId }).from(s.communityMembers).where(eq(s.communityMembers.communityId, opts.communityId))));
  }
  const distance = sql<number>`${s.runWeeks.runM} + ${s.runWeeks.walkM}`;
  const rows = await db
    .select({ w: s.runWeeks, user: runner, distance })
    .from(s.runWeeks)
    .innerJoin(s.users, eq(s.users.id, s.runWeeks.userId))
    .where(and(...where))
    .orderBy(...(opts.order === "points" ? [desc(s.runWeeks.points), desc(distance)] : [desc(distance), desc(s.runWeeks.points)]))
    .limit(500);
  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1, distance: Number(r.distance) }));
  const limit = opts.limit ?? 50;
  const shown = ranked.slice(0, limit);
  const me = ranked.find((r) => r.user.id === opts.viewerId) ?? null;
  return { rows: shown, me, total: ranked.length, meOutside: !!me && me.rank > limit };
}

/** The viewer's week: score row and rank in the overall table. */
export async function myWeek(userId: string, weekStart = weekStartOf(new Date())) {
  const [w] = await db.select().from(s.runWeeks).where(and(eq(s.runWeeks.userId, userId), eq(s.runWeeks.weekStart, weekStart)));
  if (!w) return { w: null, rank: null, runners: (await db.select({ n: count() }).from(s.runWeeks).where(eq(s.runWeeks.weekStart, weekStart)))[0].n };
  const [[{ ahead }], [{ n }]] = await Promise.all([
    db.select({ ahead: count() }).from(s.runWeeks).where(and(eq(s.runWeeks.weekStart, weekStart), sql`${s.runWeeks.points} > ${w.points}`)),
    db.select({ n: count() }).from(s.runWeeks).where(eq(s.runWeeks.weekStart, weekStart)),
  ]);
  return { w, rank: ahead + 1, runners: n };
}

/** County Cup for a month: all 47 counties, most kilometres first. */
export async function countyCup(month = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" }).format(month);
  const start = new Date(`${ymd}-01T00:00:00+03:00`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const totals = await countyTotals(db, start, end);
  const by = new Map(totals.map((t) => [t.county, t]));
  const rows = COUNTIES.map((c) => ({ county: c, km: Math.round((by.get(c)?.m ?? 0) / 100) / 10, runners: by.get(c)?.runners ?? 0 })).sort((a, b) => b.km - a.km || a.county.localeCompare(b.county));
  return { start, end, rows: rows.map((r, i) => ({ ...r, rank: r.km > 0 ? i + 1 : null })) };
}

/* ───────────── Challenges ───────────── */

const participants = sql<number>`(select count(*)::int from challenge_entries ce where ce.challenge_id = "challenges"."id")`;
const finishers = sql<number>`(select count(*)::int from challenge_entries ce where ce.challenge_id = "challenges"."id" and ce.completed_at is not null)`;

export async function listChallenges(viewerId: string) {
  const sponsor = alias(s.businesses, "sponsor");
  const rows = await db
    .select({ c: s.challenges, sponsor: { name: sponsor.name, slug: sponsor.slug, logoUrl: sponsor.logoUrl }, entry: s.challengeEntries, participants, finishers })
    .from(s.challenges)
    .leftJoin(sponsor, eq(sponsor.id, s.challenges.sponsorId))
    .leftJoin(s.challengeEntries, and(eq(s.challengeEntries.challengeId, s.challenges.id), eq(s.challengeEntries.userId, viewerId)))
    .where(and(eq(s.challenges.status, "live"), or(isNull(s.challenges.endsAt), gte(s.challenges.endsAt, sql`now() - interval '30 days'`))))
    .orderBy(asc(s.challenges.startsAt));
  const now = Date.now();
  const tag = (r: (typeof rows)[number]) => (r.c.startsAt.getTime() > now ? "upcoming" : r.c.endsAt && r.c.endsAt.getTime() < now ? "ended" : "live");
  return rows.map((r) => ({ ...r, state: tag(r) as "upcoming" | "live" | "ended", sponsor: r.sponsor?.name ? r.sponsor : null }));
}
export type ChallengeRow = Awaited<ReturnType<typeof listChallenges>>[number];

export async function getChallenge(slug: string, viewerId: string) {
  const sponsor = alias(s.businesses, "sponsor");
  const [row] = await db
    .select({ c: s.challenges, sponsor, participants, finishers })
    .from(s.challenges)
    .leftJoin(sponsor, eq(sponsor.id, s.challenges.sponsorId))
    .where(eq(s.challenges.slug, slug));
  if (!row || row.c.status !== "live") return null;
  const [entry] = await db.select().from(s.challengeEntries).where(and(eq(s.challengeEntries.challengeId, row.c.id), eq(s.challengeEntries.userId, viewerId)));
  const board = await db
    .select({ e: s.challengeEntries, user: runner })
    .from(s.challengeEntries)
    .innerJoin(s.users, eq(s.users.id, s.challengeEntries.userId))
    .where(eq(s.challengeEntries.challengeId, row.c.id))
    .orderBy(
      sql`${s.challengeEntries.completedAt} is null`,
      ...(row.c.kind === "single" && row.c.maxMs ? [sql`${s.challengeEntries.bestMs} asc nulls last`] : []),
      row.c.kind === "total" ? desc(s.challengeEntries.progressM) : asc(s.challengeEntries.completedAt),
      desc(s.challengeEntries.progressM),
    )
    .limit(50);
  const now = Date.now();
  const state = row.c.startsAt.getTime() > now ? "upcoming" : row.c.endsAt && row.c.endsAt.getTime() < now ? "ended" : "live";
  return { ...row, sponsor: row.sponsor?.id ? row.sponsor : null, entry: entry ?? null, board, state: state as "upcoming" | "live" | "ended" };
}

/** Challenges a runner finished (their trophy case). */
export async function medalsFor(userId: string) {
  return db
    .select({ c: s.challenges, completedAt: s.challengeEntries.completedAt, bestMs: s.challengeEntries.bestMs })
    .from(s.challengeEntries)
    .innerJoin(s.challenges, eq(s.challenges.id, s.challengeEntries.challengeId))
    .where(and(eq(s.challengeEntries.userId, userId), isNotNull(s.challengeEntries.completedAt)))
    .orderBy(desc(s.challengeEntries.completedAt));
}

/* ───────────── PRs and verified times ───────────── */

/** Personal records from GPS (fastest best effort per distance, honest runs only). */
export async function gpsRecords(userId: string) {
  return db
    .selectDistinctOn([s.bestEfforts.effort], { effort: s.bestEfforts.effort, ms: s.bestEfforts.ms, activityId: s.bestEfforts.activityId, at: s.bestEfforts.achievedAt })
    .from(s.bestEfforts)
    .innerJoin(s.activities, eq(s.activities.id, s.bestEfforts.activityId))
    .where(and(eq(s.bestEfforts.userId, userId), isNull(s.activities.flag)))
    .orderBy(s.bestEfforts.effort, asc(s.bestEfforts.ms));
}

const verifier = alias(s.users, "verifier");

/** Verified times (fastest approved per event) with the club that confirmed them. */
export async function verifiedTimes(userIds: string[]) {
  if (!userIds.length) return [];
  return db
    .selectDistinctOn([s.timeTrials.userId, s.timeTrials.event], { t: s.timeTrials, club: { handle: verifier.handle, displayName: verifier.displayName } })
    .from(s.timeTrials)
    .leftJoin(verifier, eq(verifier.id, s.timeTrials.verifierId))
    .where(and(inArray(s.timeTrials.userId, userIds), eq(s.timeTrials.status, "approved")))
    .orderBy(s.timeTrials.userId, s.timeTrials.event, asc(s.timeTrials.ms));
}

export async function trialsFor(userId: string) {
  return db
    .select({ t: s.timeTrials, club: { handle: verifier.handle, displayName: verifier.displayName } })
    .from(s.timeTrials)
    .leftJoin(verifier, eq(verifier.id, s.timeTrials.verifierId))
    .where(eq(s.timeTrials.userId, userId))
    .orderBy(desc(s.timeTrials.createdAt));
}

/** Times waiting for a club to confirm. */
export async function trialQueue(verifierId: string) {
  return db
    .select({ t: s.timeTrials, athlete: runner, activity: { id: s.activities.id, distanceM: s.activities.distanceM, movingS: s.activities.movingS, flag: s.activities.flag } })
    .from(s.timeTrials)
    .innerJoin(s.users, eq(s.users.id, s.timeTrials.userId))
    .leftJoin(s.activities, eq(s.activities.id, s.timeTrials.activityId))
    .where(and(eq(s.timeTrials.verifierId, verifierId), eq(s.timeTrials.status, "pending")))
    .orderBy(asc(s.timeTrials.createdAt));
}

export async function pendingTrialCount(verifierId: string) {
  const [{ n }] = await db.select({ n: count() }).from(s.timeTrials).where(and(eq(s.timeTrials.verifierId, verifierId), eq(s.timeTrials.status, "pending")));
  return n;
}

/** Verified clubs that can confirm times. */
export async function verifierClubs() {
  return db
    .select({ id: s.users.id, handle: s.users.handle, displayName: s.users.displayName, county: s.users.county })
    .from(s.users)
    .where(and(eq(s.users.role, "club"), eq(s.users.verified, true)))
    .orderBy(asc(s.users.displayName));
}

/** Running block for a profile: year totals, records, medals and the latest runs. */
export async function profileRunning(userId: string, own: boolean) {
  const yearStart = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric" }).format(new Date())}-01-01T00:00:00+03:00`);
  const [[year], gps, verified, medals, recent] = await Promise.all([
    db
      .select({ n: count(), m: sql<number>`coalesce(sum(${s.activities.distanceM}), 0)::int` })
      .from(s.activities)
      .where(and(eq(s.activities.userId, userId), gte(s.activities.startedAt, yearStart), own ? undefined : eq(s.activities.isPrivate, false))),
    gpsRecords(userId),
    verifiedTimes([userId]),
    medalsFor(userId),
    recentActivities(userId, { own, limit: 3 }),
  ]);
  return { year, gps, verified, medals, recent };
}

/* ───────────── Scouting ───────────── */

/** Best time per athlete for an event: verified trials, plus GPS best efforts unless verifiedOnly. */
export async function bestTimes(event: string, opts: { verifiedOnly?: boolean; userIds?: string[] }) {
  const trials = await db
    .select({ userId: s.timeTrials.userId, ms: min(s.timeTrials.ms) })
    .from(s.timeTrials)
    .where(and(eq(s.timeTrials.event, event), eq(s.timeTrials.status, "approved"), opts.userIds ? inArray(s.timeTrials.userId, opts.userIds) : undefined))
    .groupBy(s.timeTrials.userId);
  const out = new Map<string, { ms: number; verified: boolean }>();
  for (const t of trials) if (t.ms != null) out.set(t.userId, { ms: t.ms, verified: true });
  if (!opts.verifiedOnly) {
    const gps = await db
      .select({ userId: s.bestEfforts.userId, ms: min(s.bestEfforts.ms) })
      .from(s.bestEfforts)
      .innerJoin(s.activities, eq(s.activities.id, s.bestEfforts.activityId))
      .where(and(eq(s.bestEfforts.effort, event), isNull(s.activities.flag), opts.userIds ? inArray(s.bestEfforts.userId, opts.userIds) : undefined))
      .groupBy(s.bestEfforts.userId);
    for (const g of gps) if (g.ms != null && !out.has(g.userId)) out.set(g.userId, { ms: g.ms, verified: false });
  }
  return out;
}

/* ───────────── Group runs ───────────── */

export async function eventRunResults(eventId: number) {
  return groupRunSnapshot(db, eventId);
}

/** Group runs coming up in the runner's communities. */
export async function upcomingGroupRuns(userId: string, limit = 3) {
  const mine = db.select({ id: s.communityMembers.communityId }).from(s.communityMembers).where(eq(s.communityMembers.userId, userId));
  return db
    .select({ event: s.communityEvents, community: { slug: s.communities.slug, name: s.communities.name } })
    .from(s.communityEvents)
    .innerJoin(s.communities, eq(s.communities.id, s.communityEvents.communityId))
    .where(and(eq(s.communityEvents.isGroupRun, true), inArray(s.communityEvents.communityId, mine), gte(s.communityEvents.startsAt, new Date(Date.now() - 2 * 3600_000))))
    .orderBy(asc(s.communityEvents.startsAt))
    .limit(limit);
}

export async function privacyZonesFor(userId: string) {
  return db.select({ id: s.privacyZones.id, label: s.privacyZones.label, radiusM: s.privacyZones.radiusM, createdAt: s.privacyZones.createdAt }).from(s.privacyZones).where(eq(s.privacyZones.userId, userId)).orderBy(asc(s.privacyZones.createdAt));
}

/** Kilometres per day for the last `days` days (the hub's activity strip). */
export async function dailyKm(userId: string, days = 7) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({ day: sql<string>`(${s.activities.startedAt} at time zone 'Africa/Nairobi')::date::text`, m: sql<number>`sum(${s.activities.distanceM})::int` })
    .from(s.activities)
    .where(and(eq(s.activities.userId, userId), gte(s.activities.startedAt, since), lte(s.activities.startedAt, new Date())))
    .groupBy(sql`1`);
  return new Map(rows.map((r) => [r.day, r.m]));
}

