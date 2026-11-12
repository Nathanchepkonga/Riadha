"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chatFlags, fantasyEntries, leagueMembers, leagueMessages, leagues } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { checkMessage, type FilterKind } from "@/lib/chat/filter";
import { chatAccess, markRead, type LeagueMessage } from "@/lib/fantasy/chat";

export type SendResult = { message: LeagueMessage } | { blocked: { kind: FilterKind | "cooldown" | "rate"; notice: string } } | { error: string };

/** Blocked attempts within 15 minutes that pause someone's chatting for a while. */
const STRIKES_FOR_PAUSE = 5;

export async function sendLeagueMessage(leagueId: number, raw: string): Promise<SendResult> {
  const user = await actionUser();
  const access = await chatAccess(leagueId, user.id);
  if (!access) return { error: "Join this league to chat." };
  const body = raw.trim().replace(/\n{3,}/g, "\n\n");
  if (!body) return { error: "Type a message first." };
  if (body.length > 500) return { error: "Keep messages under 500 characters." };

  // A few blocked attempts in 15 minutes pause chatting briefly; flooding is slowed down too.
  const [[strikes], [recent]] = await Promise.all([
    db.select({ n: count() }).from(chatFlags).where(and(eq(chatFlags.userId, user.id), gt(chatFlags.createdAt, new Date(Date.now() - 15 * 60_000)))),
    db.select({ n: count() }).from(leagueMessages).where(and(eq(leagueMessages.entryId, access.entry.id), gt(leagueMessages.createdAt, new Date(Date.now() - 20_000)))),
  ]);
  if (strikes.n >= STRIKES_FOR_PAUSE) {
    return { blocked: { kind: "cooldown", notice: "You're paused from league chats for a few minutes after several messages that couldn't be sent. Take a breather and come back soon." } };
  }
  if (recent.n >= 8) return { blocked: { kind: "rate", notice: "Slow down a little: you're sending messages very fast." } };

  // The real check (the app checks too, for instant feedback). The blocked text itself is never stored.
  const verdict = checkMessage(body, { realName: user.displayName });
  if (!verdict.ok) {
    await db.insert(chatFlags).values({ userId: user.id, leagueId, kind: verdict.kind });
    return { blocked: { kind: verdict.kind, notice: verdict.notice } };
  }

  const [m] = await db.insert(leagueMessages).values({ leagueId, entryId: access.entry.id, body }).returning();
  await markRead(leagueId, access.entry.id, m.id);
  return { message: { id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), deleted: false, sender: { entryId: access.entry.id, teamName: access.entry.teamName } } };
}

/** Senders delete their own messages; owners of private leagues and admins can delete any. */
export async function deleteLeagueMessage(messageId: number) {
  const user = await actionUser();
  const [m] = await db
    .select({ id: leagueMessages.id, leagueId: leagueMessages.leagueId, senderUser: fantasyEntries.userId, owner: leagues.ownerId })
    .from(leagueMessages)
    .innerJoin(fantasyEntries, eq(fantasyEntries.id, leagueMessages.entryId))
    .innerJoin(leagues, eq(leagues.id, leagueMessages.leagueId))
    .where(eq(leagueMessages.id, messageId));
  if (!m) return;
  if (m.senderUser !== user.id && m.owner !== user.id && !user.isAdmin) throw new Error("You can only delete your own messages.");
  // Keep the row for the "This message was deleted" placeholder, but drop the text.
  await db.update(leagueMessages).set({ deletedAt: new Date(), body: "" }).where(eq(leagueMessages.id, messageId));
}

export async function setLeagueMuted(leagueId: number, muted: boolean) {
  const user = await actionUser();
  const access = await chatAccess(leagueId, user.id);
  if (!access) return;
  await db.update(leagueMembers).set({ muted }).where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.entryId, access.entry.id)));
  revalidatePath("/fantasy/leagues");
}

/** Joins a club fans' league (suggested on the Leagues screen) and opens its chat. */
export async function joinClubLeague(leagueId: number) {
  const user = await actionUser();
  const [entry] = await db.select({ id: fantasyEntries.id }).from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (!entry) redirect("/fantasy/squad");
  const [league] = await db.select({ kind: leagues.kind }).from(leagues).where(eq(leagues.id, leagueId));
  if (league?.kind !== "club") throw new Error("That isn't a club league.");
  await db.insert(leagueMembers).values({ leagueId, entryId: entry.id }).onConflictDoNothing();
  revalidatePath("/fantasy/leagues");
  redirect(`/fantasy/leagues/${leagueId}?tab=chat`);
}
