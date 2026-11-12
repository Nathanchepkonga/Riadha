"use server";

import { rm } from "node:fs/promises";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contentReports, posts, videos } from "@/db/schema";
import { actionUser, getCurrentUser } from "@/lib/auth/session";
import { REPORT_REASONS } from "@/lib/constants";
import { incomingPath, outputDir } from "@/lib/video/paths";
import { recordAudit } from "@/lib/audit";

/** Distinct open reports at which a post is hidden automatically until a moderator looks at it. */
const AUTO_HIDE_AT = 3;

const reportSchema = z.object({
  postId: z.number().int().positive(),
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

export async function reportPost(input: { postId: number; reason: string; note?: string }): Promise<{ error?: string; ok?: string }> {
  const user = await actionUser();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: "Pick a reason." };
  const { postId, reason, note } = parsed.data;
  const [post] = await db.select({ authorId: posts.authorId, hiddenAt: posts.hiddenAt }).from(posts).where(eq(posts.id, postId));
  if (!post) return { error: "This post was already removed." };
  if (post.authorId === user.id) return { error: "You can't report your own post. Delete it instead." };

  await db.insert(contentReports).values({ postId, reporterId: user.id, reason, note: note || null }).onConflictDoNothing();
  const [open] = await db.select({ n: count() }).from(contentReports).where(and(eq(contentReports.postId, postId), eq(contentReports.status, "open")));
  if (open.n >= AUTO_HIDE_AT && !post.hiddenAt) {
    await db.update(posts).set({ hiddenAt: new Date(), hiddenReason: "Under review after reports from the community" }).where(eq(posts.id, postId));
  }
  revalidatePath("/admin/reports");
  return { ok: "Thanks. Our team will review it." };
}

async function admin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admins only.");
  return user;
}

async function resolve(postId: number, status: "actioned" | "dismissed", by: string) {
  await db
    .update(contentReports)
    .set({ status, resolvedAt: new Date(), resolvedBy: by })
    .where(and(eq(contentReports.postId, postId), eq(contentReports.status, "open")));
}

/** Takes a post down; the author still sees it with the reason. */
export async function hidePost(postId: number, form: FormData) {
  const me = await admin();
  const reason = String(form.get("reason") ?? "").trim().slice(0, 200) || "Breaks the Riadha community guidelines";
  await db.update(posts).set({ hiddenAt: new Date(), hiddenReason: reason }).where(eq(posts.id, postId));
  await resolve(postId, "actioned", me.id);
  await recordAudit(db, { actorId: me.id, action: "moderation.hide_post", targetType: "post", targetId: postId, outcome: "success" });
  revalidatePath("/admin/reports");
}

/** Puts a post back (e.g. after an automatic hide turned out to be wrong) and dismisses its reports. */
export async function restorePost(postId: number) {
  const me = await admin();
  await db.update(posts).set({ hiddenAt: null, hiddenReason: null }).where(eq(posts.id, postId));
  await resolve(postId, "dismissed", me.id);
  await recordAudit(db, { actorId: me.id, action: "moderation.restore_post", targetType: "post", targetId: postId, outcome: "success" });
  revalidatePath("/admin/reports");
}

export async function dismissReports(postId: number) {
  const me = await admin();
  await resolve(postId, "dismissed", me.id);
  // An automatic hide is lifted when the reports turn out to be unfounded.
  await db.update(posts).set({ hiddenAt: null, hiddenReason: null }).where(and(eq(posts.id, postId), eq(posts.hiddenReason, "Under review after reports from the community")));
  await recordAudit(db, { actorId: me.id, action: "moderation.dismiss_reports", targetType: "post", targetId: postId, outcome: "success" });
  revalidatePath("/admin/reports");
}

/** Permanent removal (illegal content, child safety): deletes the post, its reports and its clip files. */
export async function deletePostAsAdmin(postId: number) {
  const me = await admin();
  const [post] = await db.delete(posts).where(eq(posts.id, postId)).returning({ videoId: posts.videoId });
  if (post?.videoId) {
    await db.delete(videos).where(eq(videos.id, post.videoId));
    await rm(outputDir(post.videoId), { recursive: true, force: true });
    await rm(incomingPath(post.videoId), { force: true });
  }
  await recordAudit(db, { actorId: me.id, action: "moderation.delete_post", targetType: "post", targetId: postId, outcome: "success" });
  revalidatePath("/admin/reports");
}
