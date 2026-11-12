"use server";

import { rm } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { contactRequests, follows, postLikes, posts, users, videos } from "@/db/schema";
import { actionUser, getCurrentUser } from "@/lib/auth/session";
import { ageFrom } from "@/lib/format";
import { saveUpload } from "@/lib/storage";
import { playbackUrl, posterUrlFor } from "@/lib/video/config";
import { incomingPath, outputDir } from "@/lib/video/paths";
import { createNotification } from "@/lib/notifications";

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
  if (deleted.length === 0) {
    await db.insert(follows).values({ followerId: user.id, followeeId: targetId }).onConflictDoNothing();
    const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, targetId));
    if (target) await createNotification({ userId: target.id, actorId: user.id, kind: "follow", title: `${user.displayName} followed you`, body: "View their profile to connect back.", href: `/u/${user.handle}` });
  }
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
    // Photos only: videos go through the chunked uploader and createVideoPost.
    media = await saveUpload(form.get("media"), ["image"]);
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

/** `attachTo`: one of the athlete's own run or medal posts that the clip (a Run Reel) should play on instead. */
export type VideoPostDraft = { body: string; statLabel?: string; statValue?: string; location?: string; attachTo?: number };

/**
 * Creates the post for an uploaded clip. Called by the upload manager as soon as the video exists, so the
 * athlete can carry on using the app; the post stays unpublished until the worker has processed the clip.
 */
export async function createVideoPost(input: VideoPostDraft & { videoId: string }): Promise<{ error: string } | { postId: number }> {
  const user = await actionUser();
  const parsed = postSchema.safeParse({ body: input.body ?? "", statLabel: input.statLabel || undefined, statValue: input.statValue || undefined, location: input.location || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if ((d.statLabel && !d.statValue) || (!d.statLabel && d.statValue)) return { error: "Add both a stat name and a value, or neither." };
  const [video] = await db.select().from(videos).where(and(eq(videos.id, input.videoId), eq(videos.ownerId, user.id)));
  if (!video || video.status === "failed") return { error: "This clip isn't available any more." };
  const [taken] = await db.select({ id: posts.id }).from(posts).where(eq(posts.videoId, video.id));
  if (taken) return { postId: taken.id };

  const ready = video.status === "ready";
  if (input.attachTo) {
    // A Run Reel: the run (or medal) post starts playing the clip once it's processed; it stays published.
    const [target] = await db
      .update(posts)
      .set({ videoId: video.id, mediaType: "video", mediaUrl: ready ? playbackUrl(video.id) : null, posterUrl: ready ? posterUrlFor(video.id) : null })
      .where(and(eq(posts.id, input.attachTo), eq(posts.authorId, user.id), inArray(posts.kind, ["activity", "medal"])))
      .returning({ id: posts.id, activityId: posts.activityId });
    if (!target) return { error: "This post isn't yours." };
    if (target.activityId) revalidatePath(`/run/a/${target.activityId}`);
    revalidatePath("/feed");
    return { postId: target.id };
  }
  const [post] = await db
    .insert(posts)
    .values({
      authorId: user.id,
      body: d.body,
      statLabel: d.statLabel,
      statValue: d.statValue,
      location: d.location,
      videoId: video.id,
      mediaType: "video",
      mediaUrl: ready ? playbackUrl(video.id) : null,
      posterUrl: ready ? posterUrlFor(video.id) : null,
      published: ready,
    })
    .returning({ id: posts.id });
  revalidatePath(`/u/${user.handle}`);
  return { postId: post.id };
}

export async function deletePost(postId: number) {
  const user = await actionUser();
  const [post] = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), user.isAdmin ? undefined : eq(posts.authorId, user.id)))
    .returning({ videoId: posts.videoId });
  // The clip belongs to the post: remove its files too.
  if (post?.videoId) {
    await db.delete(videos).where(eq(videos.id, post.videoId));
    await rm(outputDir(post.videoId), { recursive: true, force: true });
    await rm(incomingPath(post.videoId), { force: true });
  }
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
  await createNotification({
    userId: athlete.id,
    actorId: viewer?.id,
    kind: "contact_request",
    title: "You have a new collaboration request",
    body: `${d.firstName} ${d.lastName} would like to work with you.`,
    href: "/me/inbox",
  });
  return {
    ok: minor
      ? `Sent. ${athlete.displayName.split(" ")[0]} is under 18, so your message goes to their guardian and club first.`
      : `Sent to ${athlete.displayName}. They'll reply by email.`,
  };
}
