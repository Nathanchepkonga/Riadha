import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";

export type NotificationPreferences = {
  social: boolean;
  community: boolean;
  challenges: boolean;
  verification: boolean;
  fantasy: boolean;
  scouting: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  social: true,
  community: true,
  challenges: true,
  verification: true,
  fantasy: true,
  scouting: true,
};

export function notificationCategory(kind: string): keyof NotificationPreferences | null {
  if (kind.startsWith("event_")) return "community";
  if (kind.startsWith("challenge_")) return "challenges";
  if (kind.startsWith("verification_")) return "verification";
  if (kind.startsWith("fantasy_")) return "fantasy";
  if (kind.startsWith("scouting_")) return "scouting";
  if (["follow", "comment", "collaboration_request"].includes(kind)) return "social";
  return null;
}

export type NotificationInput = {
  userId: string;
  actorId?: string | null;
  kind: string;
  title: string;
  body?: string;
  href?: string | null;
};

export async function createNotification(input: NotificationInput) {
  if (input.actorId && input.actorId === input.userId) return;
  const [recipient] = await db.select({ preferences: users.notificationPreferences }).from(users).where(eq(users.id, input.userId));
  const category = notificationCategory(input.kind);
  if (category && recipient?.preferences?.[category] === false) return;
  await db.insert(notifications).values({
    userId: input.userId,
    actorId: input.actorId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    href: input.href ?? null,
  });
}

export async function createNotificationOnce(input: NotificationInput) {
  if (input.actorId && input.actorId === input.userId) return;
  const category = notificationCategory(input.kind);
  const [recipient] = await db.select({ preferences: users.notificationPreferences }).from(users).where(eq(users.id, input.userId));
  if (category && recipient?.preferences?.[category] === false) return;
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, input.userId), eq(notifications.kind, input.kind), input.href ? eq(notifications.href, input.href) : isNull(notifications.href)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(notifications).values({
    userId: input.userId,
    actorId: input.actorId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    href: input.href ?? null,
  });
}

export async function listNotifications(userId: string, limit = 40) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadNotifications(userId: string) {
  const rows = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).limit(100);
  return rows.length;
}
