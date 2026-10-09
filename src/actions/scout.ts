"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { scoutBookmarks, scoutStageEnum, users } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";

async function scout() {
  const user = await actionUser();
  if (!canScout(user)) throw new Error("The Scout Portal is for scouts and clubs.");
  return user;
}

/** Adds an athlete to the scout's shortlist, or removes them. Returns whether they're now saved. */
export async function toggleBookmark(athleteId: string) {
  const me = await scout();
  const removed = await db
    .delete(scoutBookmarks)
    .where(and(eq(scoutBookmarks.scoutId, me.id), eq(scoutBookmarks.athleteId, athleteId)))
    .returning();
  if (removed.length === 0) {
    const [athlete] = await db.select({ role: users.role }).from(users).where(eq(users.id, athleteId));
    if (athlete?.role !== "athlete") throw new Error("Only athletes can be shortlisted.");
    await db.insert(scoutBookmarks).values({ scoutId: me.id, athleteId }).onConflictDoNothing();
  }
  revalidatePath("/scout/shortlist");
  return removed.length === 0;
}

const updateSchema = z.object({
  stage: z.enum(scoutStageEnum.enumValues),
  note: z.string().trim().max(1000, "Keep notes under 1,000 characters."),
});

export async function updateBookmark(athleteId: string, _prev: { error?: string; ok?: string } | undefined, form: FormData) {
  const me = await scout();
  const parsed = updateSchema.safeParse({ stage: form.get("stage"), note: form.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db
    .update(scoutBookmarks)
    .set({ stage: parsed.data.stage, note: parsed.data.note || null, updatedAt: new Date() })
    .where(and(eq(scoutBookmarks.scoutId, me.id), eq(scoutBookmarks.athleteId, athleteId)));
  revalidatePath("/scout/shortlist");
  return { ok: "Saved." };
}

export async function removeBookmark(athleteId: string) {
  const me = await scout();
  await db.delete(scoutBookmarks).where(and(eq(scoutBookmarks.scoutId, me.id), eq(scoutBookmarks.athleteId, athleteId)));
  revalidatePath("/scout/shortlist");
}
