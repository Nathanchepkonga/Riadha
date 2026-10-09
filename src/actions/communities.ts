"use server";

import { and, count, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { communities, communityEvents, communityMembers, communityMessages, eventRsvps } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { getMembership, type ChatMessage } from "@/lib/communities";
import { COMMUNITY_INTERESTS, COUNTIES } from "@/lib/constants";
import { uniqueSlug } from "@/lib/slug";
import { saveUpload } from "@/lib/storage";

type State = { error?: string; ok?: string } | undefined;

async function communityById(id: number) {
  const [c] = await db.select().from(communities).where(eq(communities.id, id));
  if (!c) throw new Error("This community no longer exists.");
  return c;
}

/** Owners and community admins manage events and members; site admins can always step in. */
async function requireManager(communityId: number) {
  const user = await actionUser();
  const role = await getMembership(communityId, user.id);
  if (role !== "owner" && role !== "admin" && !user.isAdmin) throw new Error("Only community admins can do that.");
  return { user, role };
}

const communitySchema = z.object({
  name: z.string().trim().min(3, "Give your community a name (3+ characters).").max(60),
  description: z.string().trim().min(10, "Describe what the community is about (10+ characters).").max(600),
  category: z.enum(COMMUNITY_INTERESTS as [string, ...string[]], { error: "Pick a sport or interest." }),
  county: z.union([z.enum(COUNTIES as [string, ...string[]]), z.literal("")]),
});

export async function createCommunity(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = communitySchema.safeParse({
    name: form.get("name") ?? "",
    description: form.get("description") ?? "",
    category: form.get("category") ?? "",
    county: form.get("county") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [owned] = await db.select({ n: count() }).from(communities).where(eq(communities.ownerId, user.id));
  if (owned.n >= 10) return { error: "You can run up to 10 communities." };

  let cover;
  try {
    cover = await saveUpload(form.get("cover"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const d = parsed.data;
  const slug = await uniqueSlug(d.name, async (s) => (await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, s))).length > 0);
  await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(communities)
      .values({ slug, name: d.name, description: d.description, category: d.category, county: d.county || null, coverUrl: cover?.url, ownerId: user.id })
      .returning({ id: communities.id });
    await tx.insert(communityMembers).values({ communityId: c.id, userId: user.id, role: "owner" });
  });
  revalidatePath("/communities");
  redirect(`/c/${slug}?tab=chat`);
}

export async function updateCommunity(communityId: number, _prev: State, form: FormData): Promise<State> {
  await requireManager(communityId);
  const parsed = communitySchema.safeParse({
    name: form.get("name") ?? "",
    description: form.get("description") ?? "",
    category: form.get("category") ?? "",
    county: form.get("county") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let cover;
  try {
    cover = await saveUpload(form.get("cover"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const d = parsed.data;
  const [c] = await db
    .update(communities)
    .set({ name: d.name, description: d.description, category: d.category, county: d.county || null, ...(cover && { coverUrl: cover.url }) })
    .where(eq(communities.id, communityId))
    .returning({ slug: communities.slug });
  revalidatePath(`/c/${c.slug}`);
  return { ok: "Community updated." };
}

export async function joinCommunity(communityId: number) {
  const user = await actionUser();
  const c = await communityById(communityId);
  await db.insert(communityMembers).values({ communityId, userId: user.id }).onConflictDoNothing();
  revalidatePath(`/c/${c.slug}`);
  revalidatePath("/communities");
}

export async function leaveCommunity(communityId: number) {
  const user = await actionUser();
  const c = await communityById(communityId);
  if (c.ownerId === user.id) throw new Error("Owners can't leave. Hand over ownership or delete the community.");
  await db.delete(communityMembers).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
  revalidatePath(`/c/${c.slug}`);
  revalidatePath("/communities");
}

export async function deleteCommunity(communityId: number) {
  const user = await actionUser();
  const c = await communityById(communityId);
  if (c.ownerId !== user.id && !user.isAdmin) throw new Error("Only the owner can delete this community.");
  await db.delete(communities).where(eq(communities.id, communityId));
  revalidatePath("/communities");
  redirect("/communities");
}

/** Promote a member to admin, demote an admin, or hand over ownership (owner only). */
export async function setMemberRole(communityId: number, userId: string, role: "admin" | "member" | "owner") {
  const me = await actionUser();
  const c = await communityById(communityId);
  if (c.ownerId !== me.id && !me.isAdmin) throw new Error("Only the owner can change roles.");
  if (userId === c.ownerId) throw new Error("Transfer ownership to someone else first.");
  const target = await getMembership(communityId, userId);
  if (!target) throw new Error("They're not a member.");
  await db.transaction(async (tx) => {
    if (role === "owner") {
      await tx.update(communities).set({ ownerId: userId }).where(eq(communities.id, communityId));
      await tx.update(communityMembers).set({ role: "admin" }).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, c.ownerId)));
    }
    await tx.update(communityMembers).set({ role }).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  });
  revalidatePath(`/c/${c.slug}`);
}

export async function removeMember(communityId: number, userId: string) {
  const { user, role } = await requireManager(communityId);
  const c = await communityById(communityId);
  const target = await getMembership(communityId, userId);
  if (!target || userId === user.id) return;
  if (target === "owner" || (target === "admin" && role !== "owner" && !user.isAdmin)) throw new Error("You can't remove that member.");
  await db.delete(communityMembers).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  revalidatePath(`/c/${c.slug}`);
}

/* ───────── Chat ───────── */

export async function sendMessage(communityId: number, raw: string): Promise<{ error: string } | { message: ChatMessage }> {
  const user = await actionUser();
  if (!(await getMembership(communityId, user.id))) return { error: "Join the community to chat." };
  const body = raw.trim().replace(/\n{3,}/g, "\n\n");
  if (!body) return { error: "Type a message first." };
  if (body.length > 1000) return { error: "Messages are limited to 1,000 characters." };
  const [recent] = await db
    .select({ n: count() })
    .from(communityMessages)
    .where(and(eq(communityMessages.userId, user.id), gt(communityMessages.createdAt, new Date(Date.now() - 15_000))));
  if (recent.n >= 8) return { error: "You're sending messages too fast. Wait a few seconds." };
  const [m] = await db.insert(communityMessages).values({ communityId, userId: user.id, body }).returning();
  return {
    message: {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      user: { id: user.id, handle: user.handle, displayName: user.displayName, avatarUrl: user.avatarUrl },
    },
  };
}

export async function deleteMessage(messageId: number) {
  const user = await actionUser();
  const [m] = await db.select().from(communityMessages).where(eq(communityMessages.id, messageId));
  if (!m) return;
  if (m.userId !== user.id) {
    const role = await getMembership(m.communityId, user.id);
    if (role !== "owner" && role !== "admin" && !user.isAdmin) throw new Error("You can't delete this message.");
  }
  await db.delete(communityMessages).where(eq(communityMessages.id, messageId));
}

/* ───────── Events & RSVP ───────── */

/** datetime-local values are entered in Nairobi time (UTC+3). */
function nairobi(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const eventSchema = z.object({
  title: z.string().trim().min(3, "Give the event a title.").max(80),
  description: z.string().trim().max(1500),
  location: z.string().trim().min(2, "Where is it happening?").max(120),
  startsAt: z.string(),
  endsAt: z.string(),
  capacity: z.union([z.literal(""), z.coerce.number().int().min(2, "Capacity must be at least 2.").max(100_000)]),
});

export async function createEvent(communityId: number, _prev: State, form: FormData): Promise<State> {
  const { user } = await requireManager(communityId);
  const c = await communityById(communityId);
  const parsed = eventSchema.safeParse({
    title: form.get("title") ?? "",
    description: form.get("description") ?? "",
    location: form.get("location") ?? "",
    startsAt: form.get("startsAt") ?? "",
    endsAt: form.get("endsAt") ?? "",
    capacity: form.get("capacity") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const startsAt = nairobi(d.startsAt);
  if (!startsAt) return { error: "Pick a start date and time." };
  if (startsAt.getTime() < Date.now() - 60_000) return { error: "The start time is in the past." };
  const endsAt = d.endsAt ? nairobi(d.endsAt) : null;
  if (d.endsAt && (!endsAt || endsAt <= startsAt)) return { error: "The end time must be after the start." };

  const [e] = await db
    .insert(communityEvents)
    .values({
      communityId,
      title: d.title,
      description: d.description,
      location: d.location,
      startsAt,
      endsAt,
      capacity: d.capacity === "" ? null : d.capacity,
      createdBy: user.id,
    })
    .returning({ id: communityEvents.id });
  // The organiser is going by default.
  await db.insert(eventRsvps).values({ eventId: e.id, userId: user.id, status: "going" }).onConflictDoNothing();
  revalidatePath(`/c/${c.slug}`);
  redirect(`/c/${c.slug}/events/${e.id}`);
}

export async function deleteEvent(eventId: number) {
  const [e] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
  if (!e) return;
  await requireManager(e.communityId);
  const c = await communityById(e.communityId);
  await db.delete(communityEvents).where(eq(communityEvents.id, eventId));
  revalidatePath(`/c/${c.slug}`);
  redirect(`/c/${c.slug}?tab=events`);
}

/** RSVP to an event (joins the community if needed). `null` clears the RSVP. */
export async function rsvp(eventId: number, status: "going" | "interested" | null): Promise<{ error?: string }> {
  const user = await actionUser();
  const [e] = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId));
  if (!e) return { error: "This event was cancelled." };
  const c = await communityById(e.communityId);
  if ((e.endsAt ?? e.startsAt).getTime() < Date.now()) return { error: "This event has already happened." };

  if (status === null) {
    await db.delete(eventRsvps).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, user.id)));
  } else {
    await db.insert(communityMembers).values({ communityId: e.communityId, userId: user.id }).onConflictDoNothing();
    if (status === "going" && e.capacity) {
      // Count everyone else who is going, so switching from "interested" to "going" is checked too.
      const [taken] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "going"), sql`${eventRsvps.userId} <> ${user.id}`));
      if (taken.n >= e.capacity) return { error: "This event is full. Mark yourself as interested to hear about spare spots." };
    }
    await db
      .insert(eventRsvps)
      .values({ eventId, userId: user.id, status })
      .onConflictDoUpdate({ target: [eventRsvps.eventId, eventRsvps.userId], set: { status } });
  }
  revalidatePath(`/c/${c.slug}/events/${eventId}`);
  revalidatePath(`/c/${c.slug}`);
  return {};
}
