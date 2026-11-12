import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { activities, athleteStats, businesses, challenges, communities, communityEvents, fixtures, follows, kplClubs, postComments, posts, users } from "@/db/schema";

export type FeedPost = Awaited<ReturnType<typeof getPosts>>[number];

// Correlated subqueries name the outer table explicitly: in single-table selects Drizzle renders
// ${posts.id} as a bare "id", which would bind to the inner table's own id column.
const likeCount = sql<number>`(select count(*)::int from post_likes pl where pl.post_id = "posts"."id")`;
const commentCount = sql<number>`(select count(*)::int from post_comments pc where pc.post_id = "posts"."id")`;

/** Posts with author, like count and whether the viewer liked them. */
export async function getPosts(opts: {
  viewerId?: string;
  /** "watch" is the For You ranking with an extra boost for video, for the vertical reel feed. */
  mode?: "forYou" | "following" | "author" | "watch";
  authorId?: string;
  postId?: number;
  sport?: string;
  mediaOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
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
  // Clips still processing and posts taken down by moderators are hidden from everyone but their author,
  // who sees them on their own profile and post page with a status.
  const visible = and(eq(posts.published, true), isNull(posts.hiddenAt))!;
  where.push(opts.mode === "author" || opts.postId ? or(visible, eq(posts.authorId, viewer))! : visible);
  if (opts.sport) where.push(eq(users.sport, opts.sport));
  if (opts.mediaOnly) where.push(or(isNotNull(posts.mediaUrl), isNotNull(posts.statValue))!);

  // "For you": verified athletes and posts with a stat rank above raw likes; everything decays with age.
  const forYouScore = sql`(case when ${users.verified} then 12 else 0 end)
    + (case when ${posts.statValue} is not null then 8 else 0 end)
    + (case when ${posts.mediaUrl} is not null then 6 else 0 end)
    + (case when ${posts.kind} <> 'post' then 6 else 0 end)
    + least(${likeCount}, 40) * 0.3
    - extract(epoch from (now() - ${posts.createdAt})) / 21600`;
  const order = opts.mode === "forYou" ? desc(forYouScore)
    : opts.mode === "watch" ? desc(sql`${forYouScore} + (case when ${posts.mediaType} = 'video' then 10 else 0 end)`)
    : desc(posts.createdAt);

  return db
    .select({
      id: posts.id,
      body: posts.body,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      posterUrl: posts.posterUrl,
      videoId: posts.videoId,
      published: posts.published,
      hiddenReason: sql<string | null>`case when ${posts.hiddenAt} is not null then coalesce(${posts.hiddenReason}, 'Removed by moderators') end`,
      statLabel: posts.statLabel,
      statValue: posts.statValue,
      location: posts.location,
      createdAt: posts.createdAt,
      kind: posts.kind,
      data: posts.data,
      // Runs: the public numbers and privacy-trimmed route art only (never the track).
      activity: {
        id: activities.id,
        sport: activities.sport,
        title: activities.title,
        startedAt: activities.startedAt,
        distanceM: activities.distanceM,
        movingS: activities.movingS,
        elevationGainM: activities.elevationGainM,
        splits: activities.splits,
        routeArt: activities.routeArt,
        flag: activities.flag,
      },
      likes: likeCount,
      comments: commentCount,
      liked: sql<boolean>`exists(select 1 from post_likes pl where pl.post_id = ${posts.id} and pl.user_id = ${viewer})`,
      followingAuthor: sql<boolean>`exists(select 1 from follows f where f.followee_id = ${posts.authorId} and f.follower_id = ${viewer})`,
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
    .leftJoin(activities, eq(activities.id, posts.activityId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(order, desc(posts.id))
    .limit(opts.limit ?? 30)
    .offset(opts.offset ?? 0);
}

export type PostComment = {
  id: number;
  body: string;
  createdAt: string;
  user: { id: string; handle: string; displayName: string; avatarUrl: string | null; role: FeedPost["author"]["role"]; verified: boolean };
};

/** Comments on a post, oldest first. */
export async function getComments(postId: number, limit = 100): Promise<PostComment[]> {
  const rows = await db
    .select({
      id: postComments.id,
      body: postComments.body,
      createdAt: postComments.createdAt,
      user: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl, role: users.role, verified: users.verified },
    })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.userId))
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
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
      followers: sql<number>`(select count(*)::int from follows f where f.followee_id = "users"."id")`.as("followers"),
    })
    .from(users)
    .where(and(...where))
    .orderBy(desc(users.verified), desc(sql`followers`))
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

export async function searchDiscover(q: string) {
  const term = q.replace(/[%_]/g, "").trim();
  if (!term) return { communities: [], businesses: [], challenges: [], posts: [], fixtures: [], events: [] };
  const like = `%${term}%`;
  const home = alias(kplClubs, "search_home");
  const away = alias(kplClubs, "search_away");
  const [communityRows, businessRows, challengeRows, postRows, fixtureRows, eventRows] = await Promise.all([
    db
      .select({ id: communities.id, slug: communities.slug, name: communities.name, description: communities.description, category: communities.category, county: communities.county, coverUrl: communities.coverUrl })
      .from(communities)
      .where(or(ilike(communities.name, like), ilike(communities.description, like), ilike(communities.category, like), ilike(communities.county, like))!)
      .orderBy(desc(communities.createdAt))
      .limit(8),
    db
      .select({ id: businesses.id, slug: businesses.slug, name: businesses.name, description: businesses.description, category: businesses.category, county: businesses.county, logoUrl: businesses.logoUrl, verified: businesses.verified })
      .from(businesses)
      .where(and(eq(businesses.active, true), or(ilike(businesses.name, like), ilike(businesses.description, like), sql`${businesses.category}::text ilike ${like}`, ilike(businesses.county, like))!))
      .orderBy(desc(businesses.verified), desc(businesses.createdAt))
      .limit(8),
    db
      .select({ id: challenges.id, slug: challenges.slug, title: challenges.title, tagline: challenges.tagline, kind: challenges.kind, endsAt: challenges.endsAt })
      .from(challenges)
      .where(and(eq(challenges.status, "live"), or(ilike(challenges.title, like), ilike(challenges.tagline, like), ilike(challenges.description, like), ilike(challenges.occasion, like))!))
      .orderBy(desc(challenges.startsAt))
      .limit(8),
    db
      .select({ id: posts.id, body: posts.body, kind: posts.kind, author: { handle: users.handle, displayName: users.displayName } })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(eq(posts.published, true), isNull(posts.hiddenAt), or(ilike(posts.body, like), ilike(posts.location, like), ilike(posts.statLabel, like))!))
      .orderBy(desc(posts.createdAt))
      .limit(8),
    db
      .select({ id: fixtures.id, gameweekId: fixtures.gameweekId, kickoff: fixtures.kickoff, home: { name: home.name, shortName: home.shortName }, away: { name: away.name, shortName: away.shortName } })
      .from(fixtures)
      .innerJoin(home, eq(home.id, fixtures.homeClubId))
      .innerJoin(away, eq(away.id, fixtures.awayClubId))
      .where(or(ilike(home.name, like), ilike(home.shortName, like), ilike(away.name, like), ilike(away.shortName, like))!)
      .orderBy(asc(fixtures.kickoff))
      .limit(8),
    db
      .select({ id: communityEvents.id, title: communityEvents.title, location: communityEvents.location, startsAt: communityEvents.startsAt, slug: communities.slug, communityName: communities.name })
      .from(communityEvents)
      .innerJoin(communities, eq(communities.id, communityEvents.communityId))
      .where(or(ilike(communityEvents.title, like), ilike(communityEvents.description, like), ilike(communityEvents.location, like), ilike(communities.name, like))!)
      .orderBy(asc(communityEvents.startsAt))
      .limit(8),
  ]);
  return { communities: communityRows, businesses: businessRows, challenges: challengeRows, posts: postRows, fixtures: fixtureRows, events: eventRows };
}
