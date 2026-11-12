import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isVideoId } from "@/lib/video/paths";
import { ownedVideo, videoState, wakeVideoWorker } from "@/lib/video/server";

const ms = z.number().int().min(0).max(24 * 3600_000).nullable().optional();
const body = z.object({ trimStartMs: ms, trimEndMs: ms, coverMs: ms });

/** Marks the upload complete, records the edit (trim + cover) and queues it for processing. */
export async function POST(req: Request, ctx: RouteContext<"/api/videos/[id]/complete">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isVideoId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const video = await ownedVideo(id, user.id);
  if (!video) return Response.json({ error: "Not found." }, { status: 404 });
  if (video.status !== "uploading") return Response.json(videoState(video));
  if (video.receivedBytes !== video.sizeBytes) return Response.json({ ...videoState(video), error: "The upload isn't finished yet." }, { status: 409 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Bad edit settings." }, { status: 400 });
  const { trimStartMs, trimEndMs, coverMs } = parsed.data;
  if (trimStartMs != null && trimEndMs != null && trimEndMs <= trimStartMs) return Response.json({ error: "The trim end is before its start." }, { status: 400 });

  const [queued] = await db
    .update(videos)
    .set({ status: "queued", trimStartMs: trimStartMs ?? null, trimEndMs: trimEndMs ?? null, coverMs: coverMs ?? null })
    .where(and(eq(videos.id, id), eq(videos.status, "uploading")))
    .returning();
  wakeVideoWorker();
  return Response.json(videoState(queued ?? video));
}
