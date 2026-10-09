"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postComments, posts } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import type { PostComment } from "@/lib/queries";

export async function addComment(postId: number, raw: string): Promise<{ error: string } | { comment: PostComment }> {
  const user = await actionUser();
  const body = raw.trim().replace(/\n{3,}/g, "\n\n");
  if (!body) return { error: "Write a comment first." };
  if (body.length > 400) return { error: "Keep comments under 400 characters." };
  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId));
  if (!post) return { error: "This post was removed." };
  // Light flood control: at most 5 comments in 30 seconds.
  const [recent] = await db
    .select({ n: count() })
    .from(postComments)
    .where(and(eq(postComments.userId, user.id), gt(postComments.createdAt, new Date(Date.now() - 30_000))));
  if (recent.n >= 5) return { error: "Slow down a little, then try again." };

  const [c] = await db.insert(postComments).values({ postId, userId: user.id, body }).returning();
  revalidatePath(`/p/${postId}`);
  return {
    comment: {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: { id: user.id, handle: user.handle, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role, verified: user.verified },
    },
  };
}

/** Comment authors, the post's author and admins can delete a comment. */
export async function deleteComment(commentId: number) {
  const user = await actionUser();
  const [row] = await db
    .select({ id: postComments.id, userId: postComments.userId, postId: postComments.postId, postAuthor: posts.authorId })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(eq(postComments.id, commentId));
  if (!row) return;
  if (row.userId !== user.id && row.postAuthor !== user.id && !user.isAdmin) throw new Error("You can't delete this comment.");
  await db.delete(postComments).where(eq(postComments.id, commentId));
  revalidatePath(`/p/${row.postId}`);
}
