"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { athleteStats, contactRequests, users, verificationRequests } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { saveUpload } from "@/lib/storage";

type State = { error?: string; ok?: string } | undefined;

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Add your name.").max(40),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Handle: 3–20 letters, numbers or underscores."),
  bio: z.string().trim().max(300),
  quote: z.string().trim().max(120),
  tagline: z.string().trim().max(60),
  sport: z.string().trim().max(40),
  position: z.string().trim().max(40),
  county: z.string().trim().max(40),
  dateOfBirth: z.string().trim(),
  guardianPhone: z.string().trim(),
  kplClubId: z.string().trim(),
});

export async function updateProfile(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(Object.keys(profileSchema.shape).map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, d.handle));
  if (taken && taken.id !== user.id) return { error: `@${d.handle} is taken.` };
  if (d.dateOfBirth && Number.isNaN(Date.parse(d.dateOfBirth))) return { error: "Check your date of birth." };
  if (user.role === "athlete" && !d.dateOfBirth) return { error: "Athletes need a date of birth." };
  const guardian = d.guardianPhone ? normalizePhone(d.guardianPhone) : null;
  if (d.guardianPhone && !guardian) return { error: "Guardian phone number doesn't look right." };

  let avatar, hero;
  try {
    avatar = await saveUpload(form.get("avatar"), ["image"]);
    hero = await saveUpload(form.get("hero"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }

  await db
    .update(users)
    .set({
      displayName: d.displayName,
      handle: d.handle,
      bio: d.bio || null,
      quote: d.quote || null,
      tagline: d.tagline || null,
      sport: d.sport || null,
      position: d.position || null,
      county: d.county || null,
      dateOfBirth: d.dateOfBirth || null,
      guardianPhone: guardian,
      kplClubId: d.kplClubId ? Number(d.kplClubId) : null,
      ...(avatar && { avatarUrl: avatar.url }),
      ...(hero && { heroUrl: hero.url }),
      ...(form.get("removeHero") === "on" && !hero && { heroUrl: null }),
    })
    .where(eq(users.id, user.id));
  revalidatePath(`/u/${d.handle}`);
  return { ok: "Profile saved." };
}

const statSchema = z.object({
  label: z.string().trim().min(1, "Name the stat (e.g. 400m).").max(30),
  value: z.string().trim().min(1, "Add a value (e.g. 53.8s).").max(20),
  context: z.string().trim().max(40),
});

export async function addStat(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = statSchema.safeParse({ label: form.get("label") ?? "", value: form.get("value") ?? "", context: form.get("context") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.select({ id: athleteStats.id }).from(athleteStats).where(eq(athleteStats.userId, user.id));
  if (existing.length >= 8) return { error: "You can show up to 8 stats. Remove one first." };
  await db.insert(athleteStats).values({ ...parsed.data, context: parsed.data.context || null, userId: user.id, sortOrder: existing.length });
  revalidatePath("/me/edit");
  return { ok: "Stat added. Ask your club to verify it." };
}

export async function removeStat(id: number) {
  const user = await actionUser();
  await db.delete(athleteStats).where(and(eq(athleteStats.id, id), eq(athleteStats.userId, user.id)));
  revalidatePath("/me/edit");
}

const verifySchema = z.object({
  type: z.enum(["athlete", "club", "scout"]),
  legalName: z.string().trim().min(3, "Enter your full legal name (or registered club name).").max(80),
  organisation: z.string().trim().max(80),
  details: z.string().trim().min(10, "Tell us how we can confirm who you are.").max(1000),
});

export async function requestVerification(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = verifySchema.safeParse({
    type: form.get("type"),
    legalName: form.get("legalName") ?? "",
    organisation: form.get("organisation") ?? "",
    details: form.get("details") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [pending] = await db
    .select({ id: verificationRequests.id })
    .from(verificationRequests)
    .where(and(eq(verificationRequests.userId, user.id), eq(verificationRequests.status, "pending")));
  if (pending) return { error: "You already have a request in review." };

  let evidence;
  try {
    evidence = await saveUpload(form.get("evidence"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }
  await db.insert(verificationRequests).values({
    userId: user.id,
    type: parsed.data.type,
    legalName: parsed.data.legalName,
    organisation: parsed.data.organisation || null,
    details: parsed.data.details,
    evidenceUrl: evidence?.url,
  });
  revalidatePath("/me/verify");
  return { ok: "Request sent. We review within 48 hours." };
}

export async function markInboxRead() {
  const user = await actionUser();
  await db
    .update(contactRequests)
    .set({ readAt: new Date() })
    .where(and(eq(contactRequests.athleteId, user.id), isNull(contactRequests.readAt)));
}
