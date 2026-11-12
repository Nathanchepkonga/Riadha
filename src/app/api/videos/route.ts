import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { VIDEO, VIDEO_MIME_TYPES } from "@/lib/video/config";
import { incomingPath } from "@/lib/video/paths";
import { uploadQuotaError, videoState } from "@/lib/video/server";

const body = z.object({
  name: z.string().max(200).optional(),
  type: z.string().max(100),
  size: z.number().int().positive(),
  clientCompressed: z.boolean().optional(),
});

/** Starts a chunked upload: creates the video row and an empty file to append to. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const d = parsed.data;
  const type = d.type.split(";")[0].trim().toLowerCase();
  if (!VIDEO_MIME_TYPES.includes(type)) return Response.json({ error: "Upload an MP4, MOV or WebM video." }, { status: 415 });
  if (d.size > VIDEO.maxBytes) return Response.json({ error: `That video is too big (max ${VIDEO.maxBytes / 1024 / 1024}MB). Trim it first.` }, { status: 413 });
  const quota = await uploadQuotaError(user.id);
  if (quota) return Response.json({ error: quota }, { status: 429 });

  const [v] = await db
    .insert(videos)
    .values({ ownerId: user.id, originalName: d.name?.slice(0, 200), mimeType: type, sizeBytes: d.size, clientCompressed: !!d.clientCompressed })
    .returning();
  await mkdir(path.dirname(incomingPath(v.id)), { recursive: true });
  await writeFile(incomingPath(v.id), "");
  return Response.json({ ...videoState(v), chunkBytes: VIDEO.chunkBytes }, { status: 201 });
}
