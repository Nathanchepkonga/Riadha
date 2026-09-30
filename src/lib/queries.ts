import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { athleteStats, fixtures, follows, kplClubs, posts, users } from "@/db/schema";

export type FeedPost = Awaited<ReturnType<typeof getPosts>>[number];

const likeCount = sql<number>`(select count(*)::int from post_likes pl where pl.post_id = ${posts.id})`;

/** Posts with author, like count and whether the viewer liked them. */
export async function getPosts(opts: { viewerId?: string; mode?: "forYou" | "following" | "author"; authorId?: string; postId?: number; sport?: string; mediaOnly?: boolean; limit?: number }) {
  const viewer = opts.viewerId ?? "00000000-0000-0000-0000-000000000000";
  const where: SQL[] = [];
  if (opts.mode === "following") {
    where.push(
      or(
        inArray(posts.authorId, db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, viewer))),
        eq(posts.authorId, viewer),
      )!,
    );
  }
  if (opts.authorId) where.push(eq(posts.authorId, opts.authorId));
  if (opts.postId) where.push(eq(posts.id, opts.postId));
  if (opts.sport) where.push(eq(users.sport, opts.sport));
  if (opts.mediaOnly) where.push(or(isNotNull(posts.mediaUrl), isNotNull(posts.statValue))!);

  // "For you": verified athletes and posts with a stat rank above raw likes; everything decays with age.
  const forYouScore = sql`(case when ${users.verified} then 12 else 0 end)
    + (case when ${posts.statValue} is not null then 8 else 0 end)
    + (case when ${posts.mediaUrl} is not null then 6 else 0 end)
    + least(${likeCount}, 40) * 0.3
    - extract(epoch from (now() - ${posts.createdAt})) / 21600`;

  return db
    .select({
      id: posts.id,
      body: posts.body,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      statLabel: posts.statLabel,
      statValue: posts.statValue,
      location: posts.location,
      createdAt: posts.createdAt,
      likes: likeCount,
      liked: sql<boolean>`exists(select 1 from post_likes pl where pl.post_id = ${posts.id} and pl.user_id = ${viewer})`,
      author: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        role: users.role,
        verified: users.verified,
        avatarUrl: users.avatarUrl,
        sport: users.sport,
      },
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(opts.mode === "forYou" ? desc(forYouScore) : desc(posts.createdAt))
    .limit(opts.limit ?? 30);
}

export async function getProfile(handle: string, viewerId?: string) {
  const [user] = await db
    .select({
      user: users,
      club: kplClubs,
      followers: sql<number>`(select count(*)::int from follows f where f.followee_id = ${users.id})`,
      following: sql<number>`(select count(*)::int from follows f where f.follower_id = ${users.id})`,
      isFollowing: sql<boolean>`exists(select 1 from follows f where f.followee_id = ${users.id} and f.follower_id = ${viewerId ?? "00000000-0000-0000-0000-000000000000"})`,
    })
    .from(users)
    .leftJoin(kplClubs, eq(kplClubs.id, users.kplClubId))
    .where(eq(users.handle, handle.toLowerCase()));
  if (!user) return null;
  const stats = await db
    .select()
    .from(athleteStats)
    .where(eq(athleteStats.userId, user.user.id))
    .orderBy(asc(athleteStats.sortOrder), asc(athleteStats.id));
  return { ...user, stats };
}

export async function getNextFixtureForClub(clubId: number) {
  const home = alias(kplClubs, "home");
  const away = alias(kplClubs, "away");
  const [fx] = await db
    .select({ fixture: fixtures, home, away })
    .from(fixtures)
    .innerJoin(home, eq(home.id, fixtures.homeClubId))
    .innerJoin(away, eq(away.id, fixtures.awayClubId))
    .where(and(eq(fixtures.finished, false), gt(fixtures.kickoff, new Date()), or(eq(fixtures.homeClubId, clubId), eq(fixtures.awayClubId, clubId))))
    .orderBy(asc(fixtures.kickoff))
    .limit(1);
  return fx ?? null;
}

export async function searchPeople(opts: { q?: string; sport?: string; role?: "athlete" | "club" | "scout" | "fan"; limit?: number }) {
  const where: SQL[] = [eq(users.onboarded, true)];
  if (opts.role) where.push(eq(users.role, opts.role));
  else where.push(inArray(users.role, ["athlete", "club"]));
  if (opts.sport) where.push(eq(users.sport, opts.sport));
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(users.displayName, like), ilike(users.handle, like), ilike(users.county, like), ilike(users.position, like))!);
  }
  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      role: users.role,
      verified: users.verified,
      avatarUrl: users.avatarUrl,
      sport: users.sport,
      position: users.position,
      county: users.county,
      dateOfBirth: users.dateOfBirth,
      followers: sql<number>`(select count(*)::int from follows f where f.followee_id = ${users.id})`,
    })
    .from(users)
    .where(and(...where))
    .orderBy(desc(users.verified), desc(sql`(select count(*) from follows f where f.followee_id = ${users.id})`))
    .limit(opts.limit ?? 40);
  const ids = rows.map((r) => r.id);
  const topStats = ids.length
    ? await db
        .selectDistinctOn([athleteStats.userId])
        .from(athleteStats)
        .where(inArray(athleteStats.userId, ids))
        .orderBy(athleteStats.userId, asc(athleteStats.sortOrder), asc(athleteStats.id))
    : [];
  const statBy = new Map(topStats.map((s) => [s.userId, s]));
  return rows.map((r) => ({ ...r, topStat: statBy.get(r.id) ?? null }));
}
