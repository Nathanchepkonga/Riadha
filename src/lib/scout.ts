import "server-only";
import { and, arrayOverlaps, asc, desc, eq, exists, gte, ilike, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { athleteStats, posts, scoutBookmarks, users, type ScoutStage } from "@/db/schema";
import { bestTimes, verifiedTimes } from "@/lib/running/queries";

export type TalentFilters = {
  q?: string;
  sport?: string;
  position?: string;
  county?: string;
  minAge?: number;
  maxAge?: number;
  skills?: string[];
  verifiedOnly?: boolean;
  openOnly?: boolean;
  relocateOnly?: boolean;
  videoOnly?: boolean;
  /** Running times: an event (TRIAL_EVENTS key), an optional "faster than" and whether only club-verified times count. */
  event?: string;
  underMs?: number;
  verifiedTimesOnly?: boolean;
  sort?: "relevance" | "youngest" | "followers" | "newest" | "fastest";
};

export type TalentTime = { event: string; ms: number; verified: boolean; club?: string | null };

/** Date of birth bounds for an age range, relative to today. */
function dobBounds(minAge?: number, maxAge?: number) {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (years: number, extraDay = 0) => {
    const d = new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate() + extraDay));
    return iso(d);
  };
  return {
    // Age >= min  <=>  born on or before today minus `min` years
    bornOnOrBefore: minAge ? shift(minAge) : undefined,
    // Age <= max  <=>  born after today minus (max + 1) years
    bornAfter: maxAge !== undefined ? shift(maxAge + 1, 1) : undefined,
  };
}

// Correlated subqueries name the outer table explicitly: in single-table queries Drizzle renders
// ${users.id} as a bare "id", which would bind to the subquery's own id column instead.
const followers = sql<number>`(select count(*)::int from follows f where f.followee_id = "users"."id")`;
const videos = sql<number>`(select count(*)::int from posts p where p.author_id = "users"."id" and p.media_type = 'video')`;

/** Talent search for the Scout Portal. Only onboarded athletes are searchable. */
export async function searchTalent(f: TalentFilters, scoutId: string, limit = 40) {
  const where: SQL[] = [eq(users.role, "athlete"), eq(users.onboarded, true)];
  if (f.sport) where.push(eq(users.sport, f.sport));
  if (f.county) where.push(eq(users.county, f.county));
  if (f.position) where.push(ilike(users.position, `%${f.position.replace(/[%_]/g, "")}%`));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(users.displayName, like), ilike(users.handle, like), ilike(users.bio, like), ilike(users.position, like))!);
  }
  if (f.skills?.length) where.push(arrayOverlaps(users.skills, f.skills));
  if (f.verifiedOnly) where.push(eq(users.verified, true));
  if (f.openOnly) where.push(eq(users.openToOpportunities, true));
  if (f.relocateOnly) where.push(eq(users.willingToRelocate, true));
  if (f.videoOnly) where.push(exists(db.select({ one: sql`1` }).from(posts).where(and(eq(posts.authorId, users.id), eq(posts.mediaType, "video")))));
  const { bornOnOrBefore, bornAfter } = dobBounds(f.minAge, f.maxAge);
  if (bornOnOrBefore || bornAfter) where.push(isNotNull(users.dateOfBirth));
  if (bornOnOrBefore) where.push(lte(users.dateOfBirth, bornOnOrBefore));
  if (bornAfter) where.push(gte(users.dateOfBirth, bornAfter));
  // Times: verified by a club, plus GPS bests unless the scout wants verified only.
  const times = f.event ? await bestTimes(f.event, { verifiedOnly: f.verifiedTimesOnly }) : null;
  if (times) {
    const ids = [...times].filter(([, t]) => !f.underMs || t.ms <= f.underMs).map(([id]) => id);
    where.push(ids.length ? inArray(users.id, ids) : sql`false`);
  }

  const order =
    f.sort === "youngest" ? [desc(users.dateOfBirth)]
    : f.sort === "followers" ? [desc(followers)]
    : f.sort === "newest" ? [desc(users.createdAt)]
    : [desc(users.verified), desc(users.openToOpportunities), desc(followers)];

  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      verified: users.verified,
      avatarUrl: users.avatarUrl,
      sport: users.sport,
      position: users.position,
      county: users.county,
      dateOfBirth: users.dateOfBirth,
      skills: users.skills,
      heightCm: users.heightCm,
      preferredSide: users.preferredSide,
      openToOpportunities: users.openToOpportunities,
      willingToRelocate: users.willingToRelocate,
      followers,
      videos,
      saved: sql<boolean>`exists(select 1 from scout_bookmarks b where b.athlete_id = "users"."id" and b.scout_id = ${scoutId})`,
    })
    .from(users)
    .where(and(...where))
    .orderBy(...order)
    .limit(times && f.sort === "fastest" ? 300 : limit);
  if (times && f.sort === "fastest") {
    rows.sort((a, b) => (times.get(a.id)?.ms ?? Infinity) - (times.get(b.id)?.ms ?? Infinity));
    rows.splice(limit);
  }

  const ids = rows.map((r) => r.id);
  const verified = await verifiedTimes(ids);
  const timeFor = (id: string): TalentTime | null => {
    if (times && f.event) {
      const t = times.get(id);
      const club = verified.find((v) => v.t.userId === id && v.t.event === f.event)?.club?.displayName;
      return t ? { event: f.event, ms: t.ms, verified: t.verified, club } : null;
    }
    const v = verified.find((x) => x.t.userId === id);
    return v ? { event: v.t.event, ms: v.t.ms, verified: true, club: v.club?.displayName } : null;
  };
  const stats = ids.length
    ? await db.select().from(athleteStats).where(inArray(athleteStats.userId, ids)).orderBy(asc(athleteStats.sortOrder), asc(athleteStats.id))
    : [];
  const byUser = new Map<string, typeof stats>();
  for (const s of stats) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
  return rows.map((r) => ({ ...r, stats: (byUser.get(r.id) ?? []).slice(0, 2), time: timeFor(r.id) }));
}

export type Talent = Awaited<ReturnType<typeof searchTalent>>[number];

/** Skill tags in use, for the filter picker (most common first). */
export async function popularSkills(sport?: string) {
  const rows = await db.execute<{ skill: string; n: number }>(sql`
    select skill, count(*)::int as n
    from ${users}, unnest(${users.skills}) as skill
    where ${users.role} = 'athlete' ${sport ? sql`and ${users.sport} = ${sport}` : sql``}
    group by skill order by n desc, skill asc limit 24
  `);
  return [...rows].map((r) => r.skill);
}

export async function getShortlist(scoutId: string, stage?: ScoutStage) {
  return db
    .select({
      bookmark: scoutBookmarks,
      athlete: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        verified: users.verified,
        avatarUrl: users.avatarUrl,
        sport: users.sport,
        position: users.position,
        county: users.county,
        dateOfBirth: users.dateOfBirth,
        openToOpportunities: users.openToOpportunities,
      },
    })
    .from(scoutBookmarks)
    .innerJoin(users, eq(users.id, scoutBookmarks.athleteId))
    .where(and(eq(scoutBookmarks.scoutId, scoutId), stage ? eq(scoutBookmarks.stage, stage) : undefined))
    .orderBy(desc(scoutBookmarks.updatedAt));
}

export async function shortlistCounts(scoutId: string) {
  const rows = await db
    .select({ stage: scoutBookmarks.stage, n: sql<number>`count(*)::int` })
    .from(scoutBookmarks)
    .where(eq(scoutBookmarks.scoutId, scoutId))
    .groupBy(scoutBookmarks.stage);
  return Object.fromEntries(rows.map((r) => [r.stage, r.n])) as Partial<Record<ScoutStage, number>>;
}

export async function isBookmarked(scoutId: string, athleteId: string) {
  const [row] = await db
    .select({ stage: scoutBookmarks.stage })
    .from(scoutBookmarks)
    .where(and(eq(scoutBookmarks.scoutId, scoutId), eq(scoutBookmarks.athleteId, athleteId)));
  return row?.stage ?? null;
}

/** Where the searchable athletes are, most first (for the "talent across Kenya" chips). */
export async function talentByCounty(limit = 10) {
  return db
    .select({ county: users.county, n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "athlete"), eq(users.onboarded, true), isNotNull(users.county)))
    .groupBy(users.county)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}
