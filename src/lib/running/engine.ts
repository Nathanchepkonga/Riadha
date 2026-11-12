/*
 * Riadha Run engine: everything that writes running data. Takes `db` as an argument (like the fantasy
 * engine) so the seed script and the background jobs can reuse it; never import server-only modules here.
 */
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, max, min, or, sql, sum } from "drizzle-orm";
import type { DB } from "@/db/client";
import * as s from "@/db/schema";
import { checkMessage } from "@/lib/chat/filter";
import { ageFrom, formatDate } from "@/lib/format";
import { runPostTime } from "@/lib/posts";
import { GROUP_RUN, RUN_CATEGORIES } from "./constants";
import { defaultTitle } from "./format";
import { weekPoints } from "./points";
import { EFFORTS, addWeeks, analyseTrack, fastestTime, haversine, routeArt, weekRange, weekStartOf, type Flag, type Sport, type TrackPoint } from "./track";

export type ActivityInput = {
  sport: Sport;
  source: "recorded" | "gpx" | "tcx" | "fit";
  startedAt: string;
  points: unknown[];
  title?: string | null;
  isPrivate?: boolean;
  device?: string | null;
  clientId?: string | null;
};

export type IngestResult =
  | { error: string; existingId?: number }
  | {
      id: number;
      duplicate?: boolean;
      flag: Flag | null;
      prs: { key: string; ms: number }[];
      completed: { slug: string; title: string }[];
      groupRun: { title: string; slug: string; eventId: number } | null;
    };

type Runner = Pick<s.User, "id" | "dateOfBirth" | "hideRoutes">;

export const isMinor = (u: { dateOfBirth: string | null }) => {
  const age = ageFrom(u.dateOfBirth);
  return age !== null && age < 18;
};

/** Public route art for a runner's track: none for under-18s or hidden routes, privacy zones cut out. */
export async function artFor(db: DB, user: Runner, points: TrackPoint[]) {
  if (user.hideRoutes || isMinor(user)) return null;
  const zones = await db.select().from(s.privacyZones).where(eq(s.privacyZones.userId, user.id));
  return routeArt(points, zones);
}

/** Saves an activity and updates everything that depends on it. */
export async function ingestActivity(db: DB, user: Runner, input: ActivityInput): Promise<IngestResult> {
  if (input.clientId) {
    const [seen] = await db.select({ id: s.activities.id }).from(s.activities).where(and(eq(s.activities.userId, user.id), eq(s.activities.clientId, input.clientId)));
    if (seen) return { id: seen.id, duplicate: true, flag: null, prs: [], completed: [], groupRun: null };
  }
  const startedAt = new Date(input.startedAt);
  if (Number.isNaN(startedAt.getTime()) || startedAt.getTime() > Date.now() + 10 * 60_000 || startedAt.getFullYear() < 2000) return { error: "That activity has an impossible start time." };
  const [twin] = await db
    .select({ id: s.activities.id })
    .from(s.activities)
    .where(and(eq(s.activities.userId, user.id), gte(s.activities.startedAt, new Date(startedAt.getTime() - 60_000)), lte(s.activities.startedAt, new Date(startedAt.getTime() + 60_000))));
  if (twin) return { error: "You've already saved this activity.", existingId: twin.id };

  const a = analyseTrack(input.points, input.sport);
  if ("error" in a) return a;
  const title = (input.title ?? "").trim().slice(0, 80) || defaultTitle(input.sport, startedAt);
  const verdict = checkMessage(title);
  if (!verdict.ok) return { error: verdict.notice };

  const art = await artFor(db, user, a.points);
  const [row] = await db
    .insert(s.activities)
    .values({
      userId: user.id,
      sport: input.sport,
      source: input.source,
      title,
      startedAt,
      distanceM: a.distanceM,
      movingS: a.movingS,
      elapsedS: a.elapsedS,
      elevationGainM: a.elevationGainM,
      splits: a.splits,
      routeArt: art,
      profile: a.profile,
      device: input.device?.slice(0, 80) || null,
      clientId: input.clientId?.slice(0, 64) || null,
      isPrivate: !!input.isPrivate,
      flag: a.flag,
    })
    .returning();
  await db.insert(s.activityTracks).values({ activityId: row.id, points: a.points, startLat: a.points[0][0], startLng: a.points[0][1] });

  // Best efforts: a PR when it beats an existing best over that distance (a first effort sets the
  // benchmark but isn't a PR, so new runners don't score a pile of points for their first upload).
  const prs: { key: string; ms: number }[] = [];
  if (a.efforts.length) {
    const prev = await db
      .select({ effort: s.bestEfforts.effort, best: min(s.bestEfforts.ms) })
      .from(s.bestEfforts)
      .where(and(eq(s.bestEfforts.userId, user.id), inArray(s.bestEfforts.effort, a.efforts.map((e) => e.key))))
      .groupBy(s.bestEfforts.effort);
    const bestBy = new Map(prev.map((p) => [p.effort, p.best ?? Infinity]));
    const rows = a.efforts.map((e) => {
      const isPr = bestBy.has(e.key) && e.ms < bestBy.get(e.key)!;
      if (isPr) prs.push(e);
      return { userId: user.id, activityId: row.id, effort: e.key, ms: e.ms, achievedAt: startedAt, isPr };
    });
    await db.insert(s.bestEfforts).values(rows);
  }

  if (!row.isPrivate) await db.insert(s.posts).values({ authorId: user.id, kind: "activity", activityId: row.id, createdAt: runPostTime(startedAt, a.elapsedS) });

  const [groupRun, completed] = a.flag ? [null, []] : await Promise.all([matchGroupRun(db, user.id, row.id, startedAt, a.points[0]), updateChallengesFor(db, user.id, startedAt, input.sport)]);
  await rescoreAround(db, user.id, weekStartOf(startedAt));
  return { id: row.id, flag: a.flag, prs, completed, groupRun };
}

/** Links a run to a group run of one of the runner's communities: near the meeting point, around the start. */
async function matchGroupRun(db: DB, userId: string, activityId: number, startedAt: Date, start: TrackPoint) {
  const mine = db.select({ id: s.communityMembers.communityId }).from(s.communityMembers).where(eq(s.communityMembers.userId, userId));
  const candidates = await db
    .select({ event: s.communityEvents, slug: s.communities.slug, rsvp: s.eventRsvps.status })
    .from(s.communityEvents)
    .innerJoin(s.communities, eq(s.communities.id, s.communityEvents.communityId))
    .leftJoin(s.eventRsvps, and(eq(s.eventRsvps.eventId, s.communityEvents.id), eq(s.eventRsvps.userId, userId)))
    .where(
      and(
        eq(s.communityEvents.isGroupRun, true),
        inArray(s.communityEvents.communityId, mine),
        gte(s.communityEvents.startsAt, new Date(startedAt.getTime() - GROUP_RUN.lateMin * 60_000)),
        lte(s.communityEvents.startsAt, new Date(startedAt.getTime() + GROUP_RUN.earlyMin * 60_000)),
      ),
    )
    .orderBy(asc(sql`abs(extract(epoch from (${s.communityEvents.startsAt} - ${startedAt.toISOString()}::timestamptz)))`));
  const hit = candidates.find(({ event: e, rsvp }) => (e.lat != null && e.lng != null ? haversine(e.lat, e.lng, start[0], start[1]) <= GROUP_RUN.radiusM : !!rsvp));
  if (!hit) return null;
  await db.update(s.activities).set({ eventId: hit.event.id }).where(eq(s.activities.id, activityId));
  await db
    .insert(s.eventRsvps)
    .values({ eventId: hit.event.id, userId, status: "going", attendedAt: new Date() })
    .onConflictDoUpdate({ target: [s.eventRsvps.eventId, s.eventRsvps.userId], set: { status: "going", attendedAt: new Date() } });
  return { title: hit.event.title, slug: hit.slug, eventId: hit.event.id };
}

/* ───────────── Challenges ───────────── */

const counted = (userId: string) => and(eq(s.activities.userId, userId), isNull(s.activities.flag));

/**
 * Recomputes one runner's progress in a challenge from their activities in its window. Returns true when
 * this call completed it.
 */
export async function recomputeEntry(db: DB, c: s.Challenge, userId: string) {
  const window = and(
    counted(userId),
    eq(s.activities.sport, c.sport),
    gte(s.activities.startedAt, c.startsAt),
    c.endsAt ? lt(s.activities.startedAt, c.endsAt) : undefined,
  );
  const [entry] = await db.select().from(s.challengeEntries).where(and(eq(s.challengeEntries.challengeId, c.id), eq(s.challengeEntries.userId, userId)));
  if (!entry) return false;

  let progressM = 0;
  let bestMs: number | null = null;
  let doneBy: { id: number; at: Date } | null = null;
  if (c.kind === "total") {
    const acts = await db.select({ id: s.activities.id, d: s.activities.distanceM, at: s.activities.startedAt }).from(s.activities).where(window).orderBy(asc(s.activities.startedAt));
    for (const x of acts) {
      progressM += x.d;
      if (!doneBy && progressM >= c.goalM) doneBy = { id: x.id, at: x.at };
    }
  } else {
    const [{ longest }] = await db.select({ longest: max(s.activities.distanceM) }).from(s.activities).where(window);
    progressM = Math.min(longest ?? 0, c.goalM);
    // Fastest time over the goal distance: from best efforts for standard distances, else from the tracks.
    const effort = EFFORTS.find((e) => Math.abs(e.m - c.goalM) < 1);
    const qualifying = await db
      .select({ id: s.activities.id, at: s.activities.startedAt })
      .from(s.activities)
      .where(and(window, gte(s.activities.distanceM, c.goalM)))
      .orderBy(asc(s.activities.startedAt))
      .limit(40);
    const times: { id: number; at: Date; ms: number | null }[] = [];
    if (effort && qualifying.length) {
      const rows = await db
        .select({ activityId: s.bestEfforts.activityId, ms: s.bestEfforts.ms })
        .from(s.bestEfforts)
        .where(and(eq(s.bestEfforts.effort, effort.key), inArray(s.bestEfforts.activityId, qualifying.map((q) => q.id))));
      const by = new Map(rows.map((r) => [r.activityId, r.ms]));
      for (const q of qualifying) times.push({ ...q, ms: by.get(q.id) ?? null });
    } else if (qualifying.length) {
      const tracks = await db.select().from(s.activityTracks).where(inArray(s.activityTracks.activityId, qualifying.map((q) => q.id)));
      const by = new Map(tracks.map((t) => [t.activityId, fastestTime(t.points, c.goalM)]));
      for (const q of qualifying) times.push({ ...q, ms: by.get(q.id) ?? null });
    }
    for (const x of times) {
      if (x.ms != null && (bestMs == null || x.ms < bestMs)) bestMs = x.ms;
      if (!doneBy && (c.maxMs == null || (x.ms != null && x.ms <= c.maxMs))) doneBy = { id: x.id, at: x.at };
    }
  }

  const completedNow = !!doneBy && !entry.completedAt;
  await db
    .update(s.challengeEntries)
    .set({
      progressM,
      bestMs,
      completedAt: doneBy ? (entry.completedAt ?? new Date(Math.max(doneBy.at.getTime(), entry.joinedAt.getTime()))) : null,
      activityId: doneBy?.id ?? null,
    })
    .where(and(eq(s.challengeEntries.challengeId, c.id), eq(s.challengeEntries.userId, userId)));
  return completedNow;
}

/** Updates every live challenge the runner joined whose window contains this activity. */
export async function updateChallengesFor(db: DB, userId: string, at: Date, sport: Sport) {
  const rows = await db
    .select({ c: s.challenges })
    .from(s.challengeEntries)
    .innerJoin(s.challenges, eq(s.challenges.id, s.challengeEntries.challengeId))
    .where(
      and(
        eq(s.challengeEntries.userId, userId),
        eq(s.challenges.status, "live"),
        eq(s.challenges.sport, sport),
        lte(s.challenges.startsAt, at),
        or(isNull(s.challenges.endsAt), gte(s.challenges.endsAt, at)),
      ),
    );
  const done = await Promise.all(rows.map(({ c }) => recomputeEntry(db, c, userId)));
  const completed = rows.filter((_, i) => done[i]).map(({ c }) => ({ slug: c.slug, title: c.title }));
  if (completed.length) await rescoreAround(db, userId, weekStartOf(new Date()));
  return completed;
}

/* ───────────── Run League weeks ───────────── */

/** Rebuilds a runner's score for one week (and deletes the row when they did nothing). */
export async function rescoreWeek(db: DB, userId: string, weekStart: string) {
  const { start, end } = weekRange(weekStart);
  const inWeek = and(counted(userId), gte(s.activities.startedAt, start), lt(s.activities.startedAt, end));
  // Independent reads, sent together (one round trip's wait instead of five).
  const [[totals], days, [{ prs }], [{ done }], history] = await Promise.all([
    db
      .select({
        n: count(),
        runM: sql<number>`coalesce(sum(${s.activities.distanceM}) filter (where ${s.activities.sport} = 'run'), 0)::int`,
        walkM: sql<number>`coalesce(sum(${s.activities.distanceM}) filter (where ${s.activities.sport} = 'walk'), 0)::int`,
        rideM: sql<number>`coalesce(sum(${s.activities.distanceM}) filter (where ${s.activities.sport} = 'ride'), 0)::int`,
        groupRuns: sql<number>`count(*) filter (where ${s.activities.eventId} is not null)::int`,
      })
      .from(s.activities)
      .where(inWeek),
    db
      .select({ day: sql<string>`(${s.activities.startedAt} at time zone 'Africa/Nairobi')::date::text`, d: sum(s.activities.distanceM) })
      .from(s.activities)
      .where(inWeek)
      .groupBy(sql`1`),
    db
      .select({ prs: count() })
      .from(s.bestEfforts)
      .innerJoin(s.activities, eq(s.activities.id, s.bestEfforts.activityId))
      .where(and(eq(s.bestEfforts.isPr, true), inWeek)),
    db
      .select({ done: count() })
      .from(s.challengeEntries)
      .where(and(eq(s.challengeEntries.userId, userId), gte(s.challengeEntries.completedAt, start), lt(s.challengeEntries.completedAt, end))),
    db
      .select({ total: sql<number>`${s.runWeeks.runM} + ${s.runWeeks.walkM} + ${s.runWeeks.rideM}` })
      .from(s.runWeeks)
      .where(and(eq(s.runWeeks.userId, userId), gte(s.runWeeks.weekStart, addWeeks(weekStart, -4)), lt(s.runWeeks.weekStart, weekStart))),
  ]);
  if (!totals.n) {
    await db.delete(s.runWeeks).where(and(eq(s.runWeeks.userId, userId), eq(s.runWeeks.weekStart, weekStart)));
    return;
  }
  const activeDays = days.filter((d) => Number(d.d) >= 1000).length;
  const total = totals.runM + totals.walkM + totals.rideM;
  const average = history.reduce((a, h) => a + Number(h.total), 0) / 4;
  const w = { runM: totals.runM, walkM: totals.walkM, rideM: totals.rideM, activeDays, prs, groupRuns: totals.groupRuns, challenges: done, beatAverage: history.length >= 2 && total > average };
  const values = { ...w, activities: totals.n, points: weekPoints(w), updatedAt: new Date() };
  await db
    .insert(s.runWeeks)
    .values({ userId, weekStart, ...values })
    .onConflictDoUpdate({ target: [s.runWeeks.userId, s.runWeeks.weekStart], set: values });
}

/** A week and the four after it (their "beat your average" bonus depends on it). */
export async function rescoreAround(db: DB, userId: string, weekStart: string) {
  await rescoreWeek(db, userId, weekStart);
  const later = await db
    .select({ w: s.runWeeks.weekStart })
    .from(s.runWeeks)
    .where(and(eq(s.runWeeks.userId, userId), sql`${s.runWeeks.weekStart} > ${weekStart}`, lte(s.runWeeks.weekStart, addWeeks(weekStart, 4))));
  await Promise.all(later.map(({ w }) => rescoreWeek(db, userId, w)));
}

/** Deletes one of a runner's activities and rolls back what it counted for. */
export async function removeActivity(db: DB, userId: string, id: number) {
  const [a] = await db.delete(s.activities).where(and(eq(s.activities.id, id), eq(s.activities.userId, userId))).returning();
  if (!a) return null;
  const entries = await db
    .select({ c: s.challenges })
    .from(s.challengeEntries)
    .innerJoin(s.challenges, eq(s.challenges.id, s.challengeEntries.challengeId))
    .where(eq(s.challengeEntries.userId, userId));
  await Promise.all(entries.map(({ c }) => recomputeEntry(db, c, userId)));
  await rescoreAround(db, userId, weekStartOf(a.startedAt));
  return a;
}

/** Redraws every route art of a runner (after privacy zones or the hide-routes setting change). */
export async function redrawRoutes(db: DB, user: Runner) {
  const rows = await db
    .select({ id: s.activities.id, points: s.activityTracks.points })
    .from(s.activities)
    .innerJoin(s.activityTracks, eq(s.activityTracks.activityId, s.activities.id))
    .where(eq(s.activities.userId, user.id));
  const zones = user.hideRoutes || isMinor(user) ? null : await db.select().from(s.privacyZones).where(eq(s.privacyZones.userId, user.id));
  await Promise.all(
    rows.map((r) => db.update(s.activities).set({ routeArt: zones ? routeArt(r.points, zones) : null }).where(eq(s.activities.id, r.id))),
  );
}

/* ───────────── Generated content ───────────── */

/** The official Riadha account that authors weekly results and group-run recaps. */
export async function officialAccount(db: DB) {
  const [u] = await db.select().from(s.users).where(eq(s.users.handle, "riadha"));
  if (u) return u;
  const [created] = await db
    .insert(s.users)
    .values({ phone: "system:riadha", handle: "riadha", displayName: "Riadha", role: "club", verified: true, onboarded: true })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(s.users).where(eq(s.users.handle, "riadha")))[0];
}

/** Claims a digest key; false when another run already made it. */
async function claim(db: DB, key: string) {
  const [row] = await db.insert(s.runDigests).values({ key }).onConflictDoNothing().returning();
  return !!row;
}

const firstName = (n: string) => n.split(" ")[0];

/** Snapshot of a week's leaders for the results post (adults only by name). */
export async function weekLeaders(db: DB, weekStart: string, memberOf?: number) {
  const where = and(
    eq(s.runWeeks.weekStart, weekStart),
    memberOf ? inArray(s.runWeeks.userId, db.select({ id: s.communityMembers.userId }).from(s.communityMembers).where(eq(s.communityMembers.communityId, memberOf))) : undefined,
  );
  const rows = await db
    .select({ w: s.runWeeks, u: { id: s.users.id, handle: s.users.handle, displayName: s.users.displayName, avatarUrl: s.users.avatarUrl, county: s.users.county, dateOfBirth: s.users.dateOfBirth } })
    .from(s.runWeeks)
    .innerJoin(s.users, eq(s.users.id, s.runWeeks.userId))
    .where(where)
    .orderBy(desc(s.runWeeks.points))
    .limit(200);
  const adults = rows.filter((r) => !isMinor(r.u));
  const person = (r: (typeof rows)[number]) => ({ handle: r.u.handle, name: r.u.displayName, avatarUrl: r.u.avatarUrl, points: r.w.points, km: Math.round((r.w.runM + r.w.walkM + r.w.rideM) / 100) / 10 });
  const byDistance = [...adults].sort((a, b) => b.w.runM + b.w.walkM - (a.w.runM + a.w.walkM));
  const counties = new Map<string, number>();
  for (const r of rows) if (r.u.county) counties.set(r.u.county, (counties.get(r.u.county) ?? 0) + r.w.runM + r.w.walkM);
  const county = [...counties.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    runners: rows.length,
    totalKm: Math.round(rows.reduce((a, r) => a + r.w.runM + r.w.walkM + r.w.rideM, 0) / 1000),
    top: adults.slice(0, 3).map(person),
    distance: byDistance[0] ? person(byDistance[0]) : null,
    county: county ? { name: county[0], km: Math.round(county[1] / 1000) } : null,
  };
}

/** Last week's results: one feed post from Riadha, plus a message in each running community's chat. */
async function weeklyResults(db: DB) {
  const week = addWeeks(weekStartOf(new Date()), -1);
  const label = formatDate(week, { day: "numeric", month: "short" });
  const official = await officialAccount(db);
  if (await claim(db, `week:${week}`)) {
    const data = await weekLeaders(db, week);
    if (data.runners > 0) {
      const [post] = await db
        .insert(s.posts)
        .values({ authorId: official.id, kind: "run_week", body: `Run League results for the week of ${label}: ${data.runners} runners, ${data.totalKm} km.`, data: { week, ...data } })
        .returning({ id: s.posts.id });
      await db.update(s.runDigests).set({ postId: post.id }).where(eq(s.runDigests.key, `week:${week}`));
    }
  }
  const crews = await db.select({ id: s.communities.id }).from(s.communities).where(inArray(s.communities.category, RUN_CATEGORIES));
  for (const c of crews) {
    if (!(await claim(db, `week:${week}:c:${c.id}`))) continue;
    const data = await weekLeaders(db, week, c.id);
    if (data.runners < 2 || !data.top.length) continue;
    const podium = data.top.map((p, i) => `${i + 1}. ${firstName(p.name)} ${p.points} pts`).join(" · ");
    const body = `🏆 Run League, week of ${label}: ${podium}.${data.distance ? ` Most km: ${firstName(data.distance.name)} (${data.distance.km} km).` : ""} ${data.runners} of you ran ${data.totalKm} km together.`;
    await db.insert(s.communityMessages).values({ communityId: c.id, userId: official.id, body });
  }
}

/** Group runs a few hours after they started: a recap post with who came and how far they went. */
async function groupRunRecaps(db: DB) {
  const due = await db
    .select({ event: s.communityEvents, community: { slug: s.communities.slug, name: s.communities.name } })
    .from(s.communityEvents)
    .innerJoin(s.communities, eq(s.communities.id, s.communityEvents.communityId))
    .where(
      and(
        eq(s.communityEvents.isGroupRun, true),
        isNull(s.communityEvents.recapPostId),
        lt(s.communityEvents.startsAt, new Date(Date.now() - 3 * 3600_000)),
        gte(s.communityEvents.startsAt, new Date(Date.now() - 14 * 86_400_000)),
      ),
    );
  if (!due.length) return;
  const official = await officialAccount(db);
  for (const { event: e, community } of due) {
    const recap = await groupRunSnapshot(db, e.id);
    if (!recap.runners) continue;
    if (!(await claim(db, `group:${e.id}`))) continue;
    const [post] = await db
      .insert(s.posts)
      .values({
        authorId: official.id,
        kind: "group_run",
        body: `${e.title} with ${community.name}: ${recap.runners} runner${recap.runners === 1 ? "" : "s"}, ${recap.totalKm} km.`,
        data: { eventId: e.id, title: e.title, startsAt: e.startsAt.toISOString(), location: e.location, community, ...recap },
      })
      .returning({ id: s.posts.id });
    await db.update(s.communityEvents).set({ recapPostId: post.id }).where(eq(s.communityEvents.id, e.id));
    await db.update(s.runDigests).set({ postId: post.id }).where(eq(s.runDigests.key, `group:${e.id}`));
  }
}

/** Who ran a group run and how far: names and route shapes of adults only. */
export async function groupRunSnapshot(db: DB, eventId: number) {
  const rows = await db
    .select({
      a: { id: s.activities.id, distanceM: s.activities.distanceM, movingS: s.activities.movingS, routeArt: s.activities.routeArt, isPrivate: s.activities.isPrivate },
      u: { handle: s.users.handle, displayName: s.users.displayName, avatarUrl: s.users.avatarUrl, dateOfBirth: s.users.dateOfBirth },
    })
    .from(s.activities)
    .innerJoin(s.users, eq(s.users.id, s.activities.userId))
    .where(and(eq(s.activities.eventId, eventId), isNull(s.activities.flag)))
    .orderBy(desc(s.activities.distanceM));
  const adults = rows.filter((r) => !isMinor(r.u));
  const paces = rows.filter((r) => r.a.distanceM >= 1000).map((r) => (r.a.movingS / r.a.distanceM) * 1000);
  return {
    runners: rows.length,
    totalKm: Math.round(rows.reduce((t, r) => t + r.a.distanceM, 0) / 100) / 10,
    fastestPace: paces.length ? Math.round(Math.min(...paces)) : null,
    people: adults.slice(0, 8).map((r) => ({ handle: r.u.handle, name: r.u.displayName, avatarUrl: r.u.avatarUrl, km: Math.round(r.a.distanceM / 100) / 10 })),
    arts: adults.filter((r) => r.a.routeArt && !r.a.isPrivate).slice(0, 4).map((r) => r.a.routeArt!),
  };
}

/** The periodic jobs (weekly results, group-run recaps). Safe to run often and from several processes. */
export async function runRunningJobs(db: DB) {
  await weeklyResults(db);
  await groupRunRecaps(db);
}

/** County Cup: on-foot kilometres per county this month (Nairobi time). */
export async function countyTotals(db: DB, monthStart: Date, monthEnd: Date) {
  return db
    .select({
      county: s.users.county,
      m: sql<number>`coalesce(sum(${s.activities.distanceM}), 0)::int`,
      runners: sql<number>`count(distinct ${s.activities.userId})::int`,
    })
    .from(s.activities)
    .innerJoin(s.users, eq(s.users.id, s.activities.userId))
    .where(and(isNull(s.activities.flag), inArray(s.activities.sport, ["run", "walk"]), isNotNull(s.users.county), gte(s.activities.startedAt, monthStart), lt(s.activities.startedAt, monthEnd)))
    .groupBy(s.users.county);
}
