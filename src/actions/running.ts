"use server";

import { and, count, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activities, activitySportEnum, businesses, challengeEntries, challenges, posts, privacyZones, timeTrials, users } from "@/db/schema";
import { actionUser, getCurrentUser } from "@/lib/auth/session";
import { checkMessage } from "@/lib/chat/filter";
import { CHALLENGE_ACCENTS, TRIAL_EVENTS, ZONE_RADII } from "@/lib/running/constants";
import { ingestActivity, recomputeEntry, redrawRoutes, removeActivity, rescoreAround, type ActivityInput, type IngestResult } from "@/lib/running/engine";
import { parseRaceTime } from "@/lib/running/format";
import { MAX_POINTS, weekStartOf } from "@/lib/running/track";
import { runPostTime } from "@/lib/posts";
import { uniqueSlug } from "@/lib/slug";
import { createNotification } from "@/lib/notifications";

type State = { error?: string; ok?: string } | undefined;

const inputSchema = z.object({
  sport: z.enum(activitySportEnum.enumValues),
  source: z.enum(["recorded", "gpx", "tcx", "fit"]),
  startedAt: z.string().max(40),
  points: z.array(z.array(z.union([z.number(), z.null()])).min(3).max(4)).min(10).max(MAX_POINTS),
  title: z.string().max(120).nullish(),
  isPrivate: z.boolean().optional(),
  device: z.string().max(120).nullish(),
  clientId: z.string().max(64).nullish(),
});

/** Saves a recorded or uploaded activity. Idempotent per clientId, so the offline outbox can retry. */
export async function saveActivity(raw: ActivityInput): Promise<IngestResult> {
  const user = await actionUser();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { error: "That activity couldn't be read. Try exporting it again." };
  const [{ n }] = await db.select({ n: count() }).from(activities).where(and(eq(activities.userId, user.id), gte(activities.createdAt, new Date(Date.now() - 86_400_000))));
  if (n >= 60) return { error: "That's a lot of activities for one day. Try again tomorrow." };
  const result = await ingestActivity(db, user, parsed.data as ActivityInput);
  if (!("error" in result) && !result.duplicate) {
    revalidatePath("/run");
    revalidatePath("/feed");
    revalidatePath(`/u/${user.handle}`);
  }
  return result;
}

async function ownActivity(id: number) {
  const user = await actionUser();
  const [a] = await db.select().from(activities).where(and(eq(activities.id, id), eq(activities.userId, user.id)));
  if (!a) throw new Error("This activity isn't yours.");
  return { user, a };
}

export async function updateActivity(id: number, _prev: State, form: FormData): Promise<State> {
  const { user, a } = await ownActivity(id);
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  if (title.length < 2) return { error: "Give it a title." };
  const verdict = checkMessage(title);
  if (!verdict.ok) return { error: verdict.notice };
  const isPrivate = form.get("isPrivate") === "on";
  await db.update(activities).set({ title, isPrivate }).where(eq(activities.id, id));
  // Only you: no post in the feed. Back to everyone: the post comes back (keeping nothing from before).
  if (isPrivate && !a.isPrivate) await db.delete(posts).where(eq(posts.activityId, id));
  if (!isPrivate && a.isPrivate) await db.insert(posts).values({ authorId: user.id, kind: "activity", activityId: id, createdAt: runPostTime(a.startedAt, a.elapsedS) }).onConflictDoNothing();
  revalidatePath(`/run/a/${id}`);
  revalidatePath("/feed");
  return { ok: "Saved." };
}

export async function deleteActivity(id: number) {
  const user = await actionUser();
  const gone = await removeActivity(db, user.id, id);
  if (!gone) throw new Error("This activity isn't yours.");
  revalidatePath("/run");
  revalidatePath("/feed");
  revalidatePath(`/u/${user.handle}`);
  redirect("/run");
}

/* ───────────── Challenges ───────────── */

export async function joinChallenge(challengeId: number): Promise<{ completed: boolean } | { error: string }> {
  const user = await actionUser();
  const [c] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
  if (!c || c.status !== "live") return { error: "This challenge isn't open." };
  if (c.endsAt && c.endsAt.getTime() < Date.now()) return { error: "This challenge has ended." };
  await db.insert(challengeEntries).values({ challengeId, userId: user.id }).onConflictDoNothing();
  // Runs already done inside the window count straight away.
  const completed = await recomputeEntry(db, c, user.id);
  if (completed) {
    await rescoreAround(db, user.id, weekStartOf(new Date()));
    await createNotification({
      userId: user.id,
      kind: "challenge_completed",
      title: "Challenge complete",
      body: `You finished ${c.title}. Your medal is ready to share.`,
      href: `/challenges/${c.slug}`,
    });
  }
  revalidatePath(`/challenges/${c.slug}`);
  revalidatePath("/challenges");
  revalidatePath("/run");
  return { completed };
}

export async function leaveChallenge(challengeId: number) {
  const user = await actionUser();
  const [e] = await db.delete(challengeEntries).where(and(eq(challengeEntries.challengeId, challengeId), eq(challengeEntries.userId, user.id))).returning();
  if (e?.completedAt) await rescoreAround(db, user.id, weekStartOf(e.completedAt));
  const [c] = await db.select({ slug: challenges.slug }).from(challenges).where(eq(challenges.id, challengeId));
  if (c) revalidatePath(`/challenges/${c.slug}`);
  revalidatePath("/challenges");
}

/** Posts the medal of a finished challenge to the feed (once). Returns the post, for a medal reel. */
export async function shareMedal(challengeId: number): Promise<{ postId: number } | { error: string }> {
  const user = await actionUser();
  const [row] = await db
    .select({ c: challenges, e: challengeEntries })
    .from(challengeEntries)
    .innerJoin(challenges, eq(challenges.id, challengeEntries.challengeId))
    .where(and(eq(challengeEntries.challengeId, challengeId), eq(challengeEntries.userId, user.id)));
  if (!row?.e.completedAt) return { error: "Finish the challenge first." };
  const [existing] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.authorId, user.id), eq(posts.kind, "medal"), sql`${posts.data}->>'slug' = ${row.c.slug}`));
  if (existing) return { postId: existing.id };
  const [post] = await db
    .insert(posts)
    .values({
      authorId: user.id,
      kind: "medal",
      body: `Finished ${row.c.title}`,
      data: { slug: row.c.slug, title: row.c.title, goalM: row.c.goalM, accent: row.c.accent, kind: row.c.kind, completedAt: row.e.completedAt.toISOString(), bestMs: row.e.bestMs },
    })
    .returning({ id: posts.id });
  revalidatePath(`/challenges/${row.c.slug}`);
  revalidatePath("/feed");
  return { postId: post.id };
}

function nairobi(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(local)) return null;
  const d = new Date(`${local.length === 10 ? `${local}T00:00` : local}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const challengeSchema = z.object({
  title: z.string().trim().min(4, "Give the challenge a title.").max(60),
  tagline: z.string().trim().max(90),
  description: z.string().trim().max(1200),
  kind: z.enum(["single", "total"]),
  goalKm: z.coerce.number().min(1, "The goal is at least 1 km.").max(5000),
  maxTime: z.string().trim().max(10),
  startsAt: z.string(),
  endsAt: z.string(),
  occasion: z.string().trim().max(40),
  cause: z.string().trim().max(120),
  accent: z.enum(CHALLENGE_ACCENTS),
});

function readChallenge(form: FormData) {
  const parsed = challengeSchema.safeParse(Object.fromEntries(["title", "tagline", "description", "kind", "goalKm", "maxTime", "startsAt", "endsAt", "occasion", "cause", "accent"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  for (const text of [d.title, d.tagline, d.description, d.cause]) {
    const v = checkMessage(text);
    if (!v.ok) return { error: v.notice } as const;
  }
  const startsAt = nairobi(d.startsAt);
  if (!startsAt) return { error: "Pick a start date." } as const;
  // The end date is the last day that counts, so the window closes at the following midnight.
  const endsAt = d.endsAt ? nairobi(d.endsAt) : null;
  if (endsAt) endsAt.setTime(endsAt.getTime() + 86_400_000);
  if (d.endsAt && (!endsAt || endsAt <= startsAt)) return { error: "The end must be after the start." } as const;
  const maxMs = d.maxTime ? parseRaceTime(d.maxTime) : null;
  if (d.maxTime && !maxMs) return { error: "Write the time target like 25:00 or 1:45:00." } as const;
  if (maxMs && d.kind !== "single") return { error: "Time targets only work for single-run challenges." } as const;
  return {
    values: {
      title: d.title,
      tagline: d.tagline,
      description: d.description,
      kind: d.kind,
      goalM: Math.round(d.goalKm * 1000),
      maxMs,
      startsAt,
      endsAt,
      occasion: d.occasion || null,
      cause: d.cause || null,
      accent: d.accent,
    },
  } as const;
}

async function admin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admins only.");
  return user;
}

const slugTaken = async (slug: string) => !!(await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.slug, slug)))[0];

/** Admins create live challenges, optionally sponsored by a listed business. */
export async function createChallenge(_prev: State, form: FormData): Promise<State> {
  const user = await admin();
  const r = readChallenge(form);
  if ("error" in r) return { error: r.error };
  const sponsorId = Number(form.get("sponsorId")) || null;
  const slug = await uniqueSlug(r.values.title, slugTaken);
  await db.insert(challenges).values({ ...r.values, slug, sponsorId, status: "live", createdBy: user.id });
  revalidatePath("/challenges");
  revalidatePath("/admin/challenges");
  return { ok: `“${r.values.title}” is live.` };
}

/** Business owners propose a sponsored challenge; it goes live once an admin approves it. */
export async function proposeChallenge(businessId: number, _prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const [b] = await db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.ownerId, user.id)));
  if (!b) return { error: "You don't manage this business." };
  const r = readChallenge(form);
  if ("error" in r) return { error: r.error };
  const slug = await uniqueSlug(r.values.title, slugTaken);
  await db.insert(challenges).values({ ...r.values, slug, sponsorId: b.id, status: "pending", createdBy: user.id });
  revalidatePath("/admin/challenges");
  revalidatePath("/market/manage");
  return { ok: "Sent for review. We'll publish it once an admin approves it." };
}

export async function reviewChallenge(id: number, decision: "live" | "rejected", form: FormData) {
  await admin();
  const typed = String(form.get("note") ?? "").trim().slice(0, 300);
  const note = typed || (decision === "rejected" ? "This challenge doesn't meet the Riadha guidelines." : null);
  await db.update(challenges).set({ status: decision, reviewNote: note }).where(and(eq(challenges.id, id), eq(challenges.status, "pending")));
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
  revalidatePath("/market/manage");
}

/* ───────────── Verified times ───────────── */

const trialSchema = z.object({
  event: z.enum(TRIAL_EVENTS.map((e) => e.key) as [string, ...string[]], { error: "Pick the event." }),
  time: z.string().trim().min(2, "Enter the time.").max(12),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date."),
  venue: z.string().trim().min(2, "Where was it run?").max(80),
  note: z.string().trim().max(300),
  verifierId: z.uuid("Pick the club that will confirm it."),
  activityId: z.union([z.literal(""), z.coerce.number().int().positive()]),
});

/** An athlete asks a verified club to confirm a time. */
export async function submitTimeTrial(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = trialSchema.safeParse(Object.fromEntries(["event", "time", "date", "venue", "note", "verifierId", "activityId"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const ms = parseRaceTime(d.time);
  if (!ms) return { error: "Write the time like 53.8, 1:47.9 or 31:12." };
  if (new Date(`${d.date}T00:00:00+03:00`).getTime() > Date.now()) return { error: "The date is in the future." };
  for (const text of [d.venue, d.note]) {
    const v = checkMessage(text);
    if (!v.ok) return { error: v.notice };
  }
  const [club] = await db.select().from(users).where(eq(users.id, d.verifierId));
  if (!club || club.role !== "club" || !club.verified) return { error: "Pick a verified club." };
  if (club.id === user.id) return { error: "A club can't confirm its own times." };
  if (d.activityId) {
    const [a] = await db.select({ id: activities.id }).from(activities).where(and(eq(activities.id, d.activityId), eq(activities.userId, user.id)));
    if (!a) return { error: "That run isn't yours." };
  }
  const [{ open }] = await db.select({ open: count() }).from(timeTrials).where(and(eq(timeTrials.userId, user.id), eq(timeTrials.status, "pending")));
  if (open >= 10) return { error: "You have 10 times waiting already. Wait for the clubs to reply." };
  await db.insert(timeTrials).values({ userId: user.id, event: d.event, ms, date: d.date, venue: d.venue, note: d.note || null, verifierId: club.id, activityId: d.activityId || null });
  revalidatePath("/run/trials");
  return { ok: `Sent to ${club.displayName}. You'll see it here once they confirm.` };
}

/** The chosen club confirms or rejects a time. */
export async function reviewTimeTrial(id: number, decision: "approved" | "rejected", form: FormData) {
  const user = await actionUser();
  if (user.role !== "club" || !user.verified) throw new Error("Only verified clubs can confirm times.");
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || (decision === "rejected" ? "The club couldn't confirm this time." : null);
  const [t] = await db
    .update(timeTrials)
    .set({ status: decision, reviewNote: note, reviewedAt: new Date() })
    .where(and(eq(timeTrials.id, id), eq(timeTrials.verifierId, user.id), eq(timeTrials.status, "pending")))
    .returning({ userId: timeTrials.userId });
  revalidatePath("/run/trials/review");
  if (t) {
    const [a] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, t.userId));
    if (a) revalidatePath(`/u/${a.handle}`);
  }
}

/* ───────────── Privacy ───────────── */

export async function addPrivacyZone(input: { lat: number; lng: number; radiusM: number; label: string }): Promise<State> {
  const user = await actionUser();
  const label = input.label.trim().slice(0, 30) || "Private place";
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180) return { error: "We couldn't read your location." };
  if (!ZONE_RADII.includes(input.radiusM as (typeof ZONE_RADII)[number])) return { error: "Pick a size." };
  const [{ n }] = await db.select({ n: count() }).from(privacyZones).where(eq(privacyZones.userId, user.id));
  if (n >= 5) return { error: "You can hide up to 5 places." };
  await db.insert(privacyZones).values({ userId: user.id, label, lat: input.lat, lng: input.lng, radiusM: input.radiusM });
  await redrawRoutes(db, user);
  revalidatePath("/run/privacy");
  return { ok: `${label} is hidden from every route, including old ones.` };
}

export async function removePrivacyZone(id: number) {
  const user = await actionUser();
  await db.delete(privacyZones).where(and(eq(privacyZones.id, id), eq(privacyZones.userId, user.id)));
  await redrawRoutes(db, user);
  revalidatePath("/run/privacy");
}

export async function setHideRoutes(hide: boolean) {
  const user = await actionUser();
  const [u] = await db.update(users).set({ hideRoutes: hide }).where(eq(users.id, user.id)).returning();
  await redrawRoutes(db, u);
  revalidatePath("/run/privacy");
  revalidatePath(`/u/${user.handle}`);
}
