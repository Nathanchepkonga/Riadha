import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityEvents, communityMembers, communityMessages, eventRsvps, users } from "@/db/schema";

// Correlated subqueries name the outer table explicitly (a bare "id" would bind to the inner table).
const memberCount = sql<number>`(select count(*)::int from community_members m where m.community_id = "communities"."id")`;

export async function listCommunities(opts: { q?: string; category?: string; viewerId: string; limit?: number }) {
  const where: SQL[] = [];
  if (opts.category) where.push(eq(communities.category, opts.category));
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(communities.name, like), ilike(communities.description, like), ilike(communities.county, like))!);
  }
  return db
    .select({
      community: communities,
      members: memberCount,
      joined: sql<boolean>`exists(select 1 from community_members m where m.community_id = "communities"."id" and m.user_id = ${opts.viewerId})`,
      nextEvent: sql<string | null>`(select min(e.starts_at)::text from community_events e where e.community_id = "communities"."id" and e.starts_at > now())`,
    })
    .from(communities)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(memberCount), asc(communities.name))
    .limit(opts.limit ?? 40);
}

export async function myCommunities(userId: string) {
  return db
    .select({ community: communities, role: communityMembers.role, members: memberCount })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.userId, userId))
    .orderBy(asc(communities.name));
}

export async function getCommunity(slug: string, viewerId: string) {
  const [row] = await db
    .select({
      community: communities,
      members: memberCount,
      owner: { handle: users.handle, displayName: users.displayName },
    })
    .from(communities)
    .innerJoin(users, eq(users.id, communities.ownerId))
    .where(eq(communities.slug, slug));
  if (!row) return null;
  const [membership] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, row.community.id), eq(communityMembers.userId, viewerId)));
  return { ...row, role: membership?.role ?? null };
}

export async function getMembership(communityId: number, userId: string) {
  const [m] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  return m?.role ?? null;
}

export async function getMembers(communityId: number) {
  return db
    .select({
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
      user: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl, role: users.role, verified: users.verified },
    })
    .from(communityMembers)
    .innerJoin(users, eq(users.id, communityMembers.userId))
    .where(eq(communityMembers.communityId, communityId))
    .orderBy(sql`case ${communityMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`, asc(users.displayName));
}

export type ChatMessage = { id: number; body: string; createdAt: string; user: { id: string; handle: string; displayName: string; avatarUrl: string | null } };

/** Chat history (newest last). `afterId` returns only newer messages, for polling. */
export async function getMessages(communityId: number, opts: { afterId?: number; beforeId?: number; limit?: number } = {}): Promise<ChatMessage[]> {
  const where: SQL[] = [eq(communityMessages.communityId, communityId)];
  if (opts.afterId) where.push(gt(communityMessages.id, opts.afterId));
  if (opts.beforeId) where.push(lt(communityMessages.id, opts.beforeId));
  const rows = await db
    .select({
      id: communityMessages.id,
      body: communityMessages.body,
      createdAt: communityMessages.createdAt,
      user: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(communityMessages)
    .innerJoin(users, eq(users.id, communityMessages.userId))
    .where(and(...where))
    .orderBy(opts.afterId ? asc(communityMessages.id) : desc(communityMessages.id))
    .limit(opts.limit ?? 50);
  const list = opts.afterId ? rows : rows.reverse();
  return list.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}

const going = sql<number>`(select count(*)::int from event_rsvps r where r.event_id = "community_events"."id" and r.status = 'going')`;
const interested = sql<number>`(select count(*)::int from event_rsvps r where r.event_id = "community_events"."id" and r.status = 'interested')`;

export async function getEvents(communityId: number, upcoming = true, viewerId?: string) {
  return db
    .select({
      event: communityEvents,
      going,
      interested,
      myStatus: viewerId
        ? sql<"going" | "interested" | null>`(select r.status::text from event_rsvps r where r.event_id = "community_events"."id" and r.user_id = ${viewerId})`
        : sql<null>`null`,
    })
    .from(communityEvents)
    .where(and(eq(communityEvents.communityId, communityId), upcoming ? gte(communityEvents.startsAt, sql`now() - interval '6 hours'`) : lt(communityEvents.startsAt, sql`now() - interval '6 hours'`)))
    .orderBy(upcoming ? asc(communityEvents.startsAt) : desc(communityEvents.startsAt))
    .limit(upcoming ? 20 : 10);
}

export async function getEvent(eventId: number, viewerId: string) {
  const [row] = await db
    .select({
      event: communityEvents,
      community: communities,
      going,
      interested,
      myStatus: sql<"going" | "interested" | null>`(select r.status::text from event_rsvps r where r.event_id = "community_events"."id" and r.user_id = ${viewerId})`,
    })
    .from(communityEvents)
    .innerJoin(communities, eq(communities.id, communityEvents.communityId))
    .where(eq(communityEvents.id, eventId));
  if (!row) return null;
  const attendees = await db
    .select({ status: eventRsvps.status, user: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl } })
    .from(eventRsvps)
    .innerJoin(users, eq(users.id, eventRsvps.userId))
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(asc(eventRsvps.createdAt))
    .limit(60);
  return { ...row, attendees };
}

/** Upcoming events across the communities a user belongs to. */
export async function upcomingForUser(userId: string, limit = 5) {
  const mine = db.select({ id: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, userId));
  return db
    .select({ event: communityEvents, community: { slug: communities.slug, name: communities.name }, going })
    .from(communityEvents)
    .innerJoin(communities, eq(communities.id, communityEvents.communityId))
    .where(and(inArray(communityEvents.communityId, mine), gte(communityEvents.startsAt, new Date())))
    .orderBy(asc(communityEvents.startsAt))
    .limit(limit);
}
