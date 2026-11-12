import "server-only";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { videos, type Video } from "@/db/schema";
import { playbackUrl, posterUrlFor, type VideoState } from "./config";

export function videoState(v: Video): VideoState {
  return {
    id: v.id,
    status: v.status,
    sizeBytes: v.sizeBytes,
    receivedBytes: v.receivedBytes,
    error: v.status === "failed" ? "We couldn't process this clip. Try another file or record it again." : null,
    playbackUrl: v.status === "ready" ? playbackUrl(v.id) : null,
    posterUrl: v.status === "ready" ? posterUrlFor(v.id) : null,
  };
}

export async function ownedVideo(id: string, userId: string) {
  const [v] = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.ownerId, userId)));
  return v ?? null;
}

/** Abuse limits: at most 3 uploads in flight and 30 new clips a day per person. */
export async function uploadQuotaError(userId: string) {
  const [[inFlight], [today]] = await Promise.all([
    db.select({ n: count() }).from(videos).where(and(eq(videos.ownerId, userId), inArray(videos.status, ["uploading"]))),
    db.select({ n: count() }).from(videos).where(and(eq(videos.ownerId, userId), gt(videos.createdAt, new Date(Date.now() - 24 * 3600_000)))),
  ]);
  if (inFlight.n >= 3) return "Finish or cancel your other uploads first.";
  if (today.n >= 30) return "You've hit today's limit of 30 clips. Try again tomorrow.";
  return null;
}

/** Nudges the in-process worker (if this server runs one) so a queued clip starts right away. */
export function wakeVideoWorker() {
  (globalThis as unknown as { riadhaVideoWorker?: { wake: () => void } }).riadhaVideoWorker?.wake();
}
