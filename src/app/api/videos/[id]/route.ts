import { open, rm } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, videos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { VIDEO } from "@/lib/video/config";
import { incomingPath, isVideoId, outputDir } from "@/lib/video/paths";
import { ownedVideo, videoState } from "@/lib/video/server";

async function load(ctx: RouteContext<"/api/videos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Please sign in again." }, { status: 401 }) };
  const { id } = await ctx.params;
  if (!isVideoId(id)) return { error: Response.json({ error: "Not found." }, { status: 404 }) };
  const video = await ownedVideo(id, user.id);
  if (!video) return { error: Response.json({ error: "Not found." }, { status: 404 }) };
  return { video };
}

/** Upload progress and processing state (the client resumes from `receivedBytes`). */
export async function GET(_req: Request, ctx: RouteContext<"/api/videos/[id]">) {
  const { video, error } = await load(ctx);
  if (error) return error;
  return Response.json(videoState(video), { headers: { "Cache-Control": "no-store" } });
}

/**
 * Appends one chunk. The client sends `Upload-Offset`; it must equal what we already have, so a retried
 * chunk after a dropped connection can never be written twice.
 */
export async function PUT(req: Request, ctx: RouteContext<"/api/videos/[id]">) {
  const { video, error } = await load(ctx);
  if (error) return error;
  if (video.status !== "uploading") return Response.json(videoState(video), { status: 409 });

  const offset = Number(req.headers.get("upload-offset"));
  const chunk = Buffer.from(await req.arrayBuffer());
  if (!Number.isInteger(offset) || offset < 0) return Response.json({ error: "Missing Upload-Offset." }, { status: 400 });
  if (chunk.length === 0 || chunk.length > VIDEO.chunkBytes) return Response.json({ error: "Bad chunk size." }, { status: 400 });
  // Already have this chunk (the response to an earlier attempt was lost): just report where we are.
  if (offset + chunk.length <= video.receivedBytes) return Response.json(videoState(video));
  if (offset !== video.receivedBytes) return Response.json(videoState(video), { status: 409 });
  if (offset + chunk.length > video.sizeBytes) return Response.json({ error: "More data than announced." }, { status: 400 });

  const fh = await open(incomingPath(video.id), "r+");
  try {
    await fh.write(chunk, 0, chunk.length, offset);
  } finally {
    await fh.close();
  }
  // Conditional on the old offset, so two racing requests can't both advance it.
  const [updated] = await db
    .update(videos)
    .set({ receivedBytes: offset + chunk.length })
    .where(and(eq(videos.id, video.id), eq(videos.receivedBytes, offset)))
    .returning();
  return Response.json(videoState(updated ?? video), { status: updated ? 200 : 409 });
}

/** Cancels an upload or deletes a clip, with any unpublished post waiting on it. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/videos/[id]">) {
  const { video, error } = await load(ctx);
  if (error) return error;
  await db.delete(posts).where(and(eq(posts.videoId, video.id), eq(posts.published, false)));
  await db.delete(videos).where(eq(videos.id, video.id));
  await rm(incomingPath(video.id), { force: true });
  await rm(outputDir(video.id), { recursive: true, force: true });
  return new Response(null, { status: 204 });
}
