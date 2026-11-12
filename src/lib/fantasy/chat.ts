import "server-only";
import { and, asc, desc, eq, gt, lt, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { fantasyEntries, kplClubs, leagueMembers, leagueMessages, leagues } from "@/db/schema";

/*
 * League chat queries. Identity in chat is the fantasy team (entry), never the person: no real names,
 * avatars or profile links leave this module.
 */

export type LeagueMessage = { id: number; body: string; createdAt: string; deleted: boolean; sender: { entryId: number; teamName: string } };

/** The viewer's membership of a chat-enabled league, or null. Public (Riadha Overall) has no chat. */
export async function chatAccess(leagueId: number, userId: string) {
  const [row] = await db
    .select({ league: leagues, entry: { id: fantasyEntries.id, teamName: fantasyEntries.teamName }, lastRead: leagueMembers.lastReadMessageId, muted: leagueMembers.muted })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .innerJoin(fantasyEntries, eq(fantasyEntries.id, leagueMembers.entryId))
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(fantasyEntries.userId, userId)));
  if (!row || row.league.kind === "public") return null;
  return row;
}

export async function getLeagueMessages(leagueId: number, opts: { afterId?: number; beforeId?: number; limit?: number } = {}): Promise<LeagueMessage[]> {
  const where: SQL[] = [eq(leagueMessages.leagueId, leagueId)];
  if (opts.afterId) where.push(gt(leagueMessages.id, opts.afterId));
  if (opts.beforeId) where.push(lt(leagueMessages.id, opts.beforeId));
  const rows = await db
    .select({ id: leagueMessages.id, body: leagueMessages.body, createdAt: leagueMessages.createdAt, deletedAt: leagueMessages.deletedAt, entryId: fantasyEntries.id, teamName: fantasyEntries.teamName })
    .from(leagueMessages)
    .innerJoin(fantasyEntries, eq(fantasyEntries.id, leagueMessages.entryId))
    .where(and(...where))
    .orderBy(opts.afterId ? asc(leagueMessages.id) : desc(leagueMessages.id))
    .limit(opts.limit ?? 50);
  const list = opts.afterId ? rows : rows.reverse();
  return list.map((m) => ({ id: m.id, body: m.deletedAt ? "" : m.body, createdAt: m.createdAt.toISOString(), deleted: !!m.deletedAt, sender: { entryId: m.entryId, teamName: m.teamName } }));
}

export async function markRead(leagueId: number, entryId: number, upToId: number) {
  await db
    .update(leagueMembers)
    .set({ lastReadMessageId: upToId })
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.entryId, entryId), lt(leagueMembers.lastReadMessageId, upToId)));
}

/**
 * The chat list (WhatsApp pattern): every chat-enabled league the entry is in, with the last message,
 * unread count and mute state, most recent activity first.
 */
export async function myChats(entryId: number) {
  const rows = await db
    .select({
      league: { id: leagues.id, name: leagues.name, code: leagues.code, kind: leagues.kind, ownerId: leagues.ownerId },
      club: { shortName: kplClubs.shortName, primaryColor: kplClubs.primaryColor, secondaryColor: kplClubs.secondaryColor },
      muted: leagueMembers.muted,
      members: sql<number>`(select count(*)::int from league_members m where m.league_id = "leagues"."id")`,
      unread: sql<number>`(select count(*)::int from league_messages x where x.league_id = "leagues"."id" and x.id > "league_members"."last_read_message_id" and x.entry_id <> ${entryId} and x.deleted_at is null)`,
      last: sql<{ id: number; body: string; deleted: boolean; team: string; at: string; mine: boolean } | null>`(
        select json_build_object('id', x.id, 'body', case when x.deleted_at is null then x.body else '' end, 'deleted', x.deleted_at is not null,
          'team', e.team_name, 'at', x.created_at, 'mine', x.entry_id = ${entryId})
        from league_messages x join fantasy_entries e on e.id = x.entry_id
        where x.league_id = "leagues"."id" order by x.id desc limit 1)`,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .leftJoin(kplClubs, eq(kplClubs.id, leagues.clubId))
    .where(and(eq(leagueMembers.entryId, entryId), ne(leagues.kind, "public")))
    .orderBy(desc(sql`coalesce((select max(x.id) from league_messages x where x.league_id = "leagues"."id"), 0)`), asc(leagues.id));
  return rows;
}

/** Unread messages across chats that aren't muted (the dock badge). */
export async function unreadTotal(userId: string) {
  const [row] = await db.execute<{ n: number }>(sql`
    select coalesce(sum((select count(*) from league_messages x
      where x.league_id = m.league_id and x.id > m.last_read_message_id and x.entry_id <> m.entry_id and x.deleted_at is null)), 0)::int as n
    from league_members m
    join fantasy_entries e on e.id = m.entry_id
    join leagues l on l.id = m.league_id
    where e.user_id = ${userId} and m.muted = false and l.kind <> 'public'`);
  return row?.n ?? 0;
}

/** Club leagues to suggest: the supporter's own club first, then the rest, minus ones already joined. */
export async function clubLeagueSuggestions(entryId: number, favouriteClubId: number | null) {
  const joined = db.select({ id: leagueMembers.leagueId }).from(leagueMembers).where(eq(leagueMembers.entryId, entryId));
  const rows = await db
    .select({
      league: { id: leagues.id, name: leagues.name },
      club: { id: kplClubs.id, name: kplClubs.name, shortName: kplClubs.shortName, primaryColor: kplClubs.primaryColor, secondaryColor: kplClubs.secondaryColor },
      members: sql<number>`(select count(*)::int from league_members m where m.league_id = "leagues"."id")`,
    })
    .from(leagues)
    .innerJoin(kplClubs, eq(kplClubs.id, leagues.clubId))
    .where(and(eq(leagues.kind, "club"), notInArray(leagues.id, joined)))
    .orderBy(asc(kplClubs.name));
  const favourite = rows.find((r) => r.club.id === favouriteClubId) ?? null;
  return { favourite, others: rows.filter((r) => r !== favourite) };
}
