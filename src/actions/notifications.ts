"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "@/lib/notifications";

export async function markNotificationsRead() {
  const user = await actionUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/me/notifications");
  revalidatePath("/feed");
}

export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>) {
  const user = await actionUser();
  const next = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...Object.fromEntries(Object.entries(preferences).filter(([key, value]) => key in DEFAULT_NOTIFICATION_PREFERENCES && typeof value === "boolean")),
  };
  await db.update(users).set({ notificationPreferences: next }).where(eq(users.id, user.id));
  revalidatePath("/me/settings");
}
