"use server";

import { and, eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { contactRequests, follows, postLikes, posts, users } from "@/db/schema";
import { actionUser, getCurrentUser } from "@/lib/auth/session";
import { ageFrom } from "@/lib/format";
import { saveUpload } from "@/lib/storage";

export async function toggleLike(postId: number) {
  const user = await actionUser();
  const deleted = await db
    .delete(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)))
    .returning();
  if (deleted.length === 0) await db.insert(postLikes).values({ postId, userId: user.id }).onConflictDoNothing();
  return deleted.length === 0;
}

export async function toggleFollow(targetId: string) {
  const user = await actionUser();
  if (targetId === user.id) return false;
  const deleted = await db
    .delete(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followeeId, targetId)))
    .returning();
  if (deleted.length === 0) await db.insert(follows).values({ followerId: user.id, followeeId: targetId }).onConflictDoNothing();
  refresh();
  return deleted.length === 0;
}

const postSchema = z.object({
  body: z.string().trim().max(600),
  statLabel: z.string().trim().max(30).optional(),
  statValue: z.string().trim().max(20).optional(),
  location: z.string().trim().max(60).optional(),
});

export async function createPost(_prev: { error?: string } | undefined, form: FormData) {
  const user = await actionUser();
  const parsed = postSchema.safeParse({
    body: form.get("body") ?? "",
    statLabel: form.get("statLabel") || undefined,
    statValue: form.get("statValue") || undefined,
    location: form.get("location") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if ((d.statLabel && !d.statValue) || (!d.statLabel && d.statValue)) return { error: "Add both a stat name and a value, or neither." };

  let media;
  try {
    media = await saveUpload(form.get("media"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!d.body && !media && !d.statValue) return { error: "Write something, add a photo or video, or log a stat." };

  const [post] = await db
    .insert(posts)
    .values({
      authorId: user.id,
      body: d.body,
      statLabel: d.statLabel,
      statValue: d.statValue,
      location: d.location,
      mediaUrl: media?.url,
      mediaType: media?.kind,
    })
    .returning({ id: posts.id });
  revalidatePath("/feed");
  redirect(`/p/${post.id}`);
}

export async function deletePost(postId: number) {
  const user = await actionUser();
  await db.delete(posts).where(and(eq(posts.id, postId), user.isAdmin ? undefined : eq(posts.authorId, user.id)));
  redirect(`/u/${user.handle}`);
}

const contactSchema = z.object({
  athleteId: z.uuid(),
  firstName: z.string().trim().min(1, "Add your first name.").max(40),
  lastName: z.string().trim().min(1, "Add your last name.").max(40),
  email: z.email("Enter a valid email address."),
  message: z.string().trim().min(10, "Tell them a bit more (10+ characters).").max(2000),
  terms: z.literal("on", { error: "Please accept the terms first." }),
});

/** The "ideas for collaboration?" form. Requests to under-18s are routed to their guardian and club. */
export async function sendContactRequest(_prev: { error?: string; ok?: string } | undefined, form: FormData) {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const viewer = await getCurrentUser();
  const [athlete] = await db.select().from(users).where(eq(users.id, d.athleteId));
  if (!athlete) return { error: "This profile no longer exists." };
  if (viewer?.id === athlete.id) return { error: "That's your own profile." };
  const minor = (ageFrom(athlete.dateOfBirth) ?? 99) < 18;

  await db.insert(contactRequests).values({
    athleteId: athlete.id,
    fromUserId: viewer?.id,
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    message: d.message,
    routedToGuardian: minor,
  });
  return {
    ok: minor
      ? `Sent. ${athlete.displayName.split(" ")[0]} is under 18, so your message goes to their guardian and club first.`
      : `Sent to ${athlete.displayName}. They'll reply by email.`,
  };
}
