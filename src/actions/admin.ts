"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { gameweeks, players, users, verificationRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { recalculateGameweek, saveFixtureResult, type StatInput } from "@/lib/fantasy/engine";

async function admin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admins only.");
  return user;
}

export async function reviewVerification(id: number, decision: "approved" | "rejected", form: FormData) {
  const me = await admin();
  const note = String(form.get("note") ?? "").trim() || null;
  const [req] = await db.select().from(verificationRequests).where(and(eq(verificationRequests.id, id), eq(verificationRequests.status, "pending")));
  if (!req) return;
  await db.transaction(async (tx) => {
    await tx
      .update(verificationRequests)
      // Evidence images are dropped once a decision is made (data minimisation).
      .set({ status: decision, adminNote: note, reviewedAt: new Date(), reviewedBy: me.id, evidenceUrl: null })
      .where(eq(verificationRequests.id, id));
    if (decision === "approved") {
      await tx.update(users).set({ role: req.type, verified: true }).where(eq(users.id, req.userId));
    }
  });
  revalidatePath("/admin/verification");
}

export async function revokeVerification(userId: string) {
  await admin();
  await db.update(users).set({ verified: false }).where(eq(users.id, userId));
  revalidatePath("/admin/verification");
}

const statRow = z.object({
  playerId: z.number().int(),
  minutes: z.number().int().min(0).max(130),
  goals: z.number().int().min(0).max(10),
  assists: z.number().int().min(0).max(10),
  saves: z.number().int().min(0).max(30),
  penSaved: z.number().int().min(0).max(5),
  penMissed: z.number().int().min(0).max(5),
  yellow: z.number().int().min(0).max(1),
  red: z.number().int().min(0).max(1),
  ownGoals: z.number().int().min(0).max(5),
});

export async function saveFixture(
  fixtureId: number,
  input: { homeScore: number; awayScore: number; finished: boolean; rows: StatInput[] },
): Promise<{ error?: string; ok?: string }> {
  await admin();
  const scores = z.object({ homeScore: z.number().int().min(0).max(30), awayScore: z.number().int().min(0).max(30), finished: z.boolean() }).safeParse(input);
  const rows = z.array(statRow).safeParse(input.rows);
  if (!scores.success || !rows.success) return { error: "Check the numbers: something is out of range." };
  try {
    await saveFixtureResult(db, fixtureId, { ...scores.data, rows: rows.data });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/gameweeks");
  return { ok: "Saved. Every manager's score for this gameweek has been recalculated." };
}

export async function setGameweekFinished(gwId: number, finished: boolean) {
  await admin();
  await db.update(gameweeks).set({ finished }).where(eq(gameweeks.id, gwId));
  await recalculateGameweek(db, gwId);
  revalidatePath("/admin/gameweeks");
}

export async function recalcGameweek(gwId: number) {
  await admin();
  await recalculateGameweek(db, gwId);
  revalidatePath("/admin/gameweeks");
}

export async function updateDeadline(gwId: number, form: FormData) {
  await admin();
  // datetime-local is entered in Nairobi time (UTC+3).
  const local = String(form.get("deadline") ?? "");
  const date = new Date(`${local}:00+03:00`);
  if (Number.isNaN(date.getTime())) return;
  await db.update(gameweeks).set({ deadline: date }).where(eq(gameweeks.id, gwId));
  revalidatePath("/admin/gameweeks");
}

const playerSchema = z.object({
  name: z.string().trim().min(3).max(60),
  clubId: z.coerce.number().int().positive(),
  position: z.enum(["GK", "DEF", "MID", "FWD"]),
  price: z.coerce.number().min(3.5).max(15),
});

export async function addPlayer(_prev: { error?: string; ok?: string } | undefined, form: FormData) {
  await admin();
  const parsed = playerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Name, club, position and a price between 3.5 and 15.0 are required." };
  await db.insert(players).values({ ...parsed.data, price: Math.round(parsed.data.price * 10) });
  revalidatePath("/admin/players");
  return { ok: `${parsed.data.name} added.` };
}

export async function updatePlayer(id: number, form: FormData) {
  await admin();
  const price = Number(form.get("price"));
  const available = form.get("available") === "on";
  if (!Number.isFinite(price) || price < 3.5 || price > 15) return;
  await db.update(players).set({ price: Math.round(price * 10), available }).where(eq(players.id, id));
  revalidatePath("/admin/players");
}
