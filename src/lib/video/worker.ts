import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { posts, videos } from "@/db/schema";
import { VIDEO, playbackUrl, posterUrlFor } from "./config";
import { extractPoster, playlistDurationMs, probe, transcodeHls } from "./ffmpeg";
import { incomingPath, outputDir } from "./paths";

/*
 * The video worker. It takes `db` as an argument (like the fantasy engine) so it runs both inside the
 * Next.js server (src/instrumentation.ts) and as a standalone process (npm run worker:video).
 * Jobs are rows in `videos` with status "queued"; claiming uses FOR UPDATE SKIP LOCKED, so several
 * workers can run side by side without processing the same clip twice.
 */

const MAX_ATTEMPTS = 3;
const STALE_MS = 30 * 60_000;

/** Claims the oldest queued video, or returns null. Also re-queues jobs whose worker died mid-way. */
export async function claimNextVideo(db: DB) {
  await db
    .update(videos)
    .set({ status: "queued" })
    .where(and(eq(videos.status, "processing"), lt(videos.processingStartedAt, new Date(Date.now() - STALE_MS)), lt(videos.attempts, MAX_ATTEMPTS)));
  const rows = await db.execute<{ id: string }>(sql`
    update videos set status = 'processing', processing_started_at = now(), attempts = attempts + 1
    where id = (select id from videos where status = 'queued' order by created_at for update skip locked limit 1)
    returning id`);
  return [...rows][0]?.id ?? null;
}

/** Transcodes one claimed video and publishes the posts waiting on it. Never throws. */
export async function processVideo(db: DB, id: string, log: (msg: string) => void = console.log) {
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return;
  const input = incomingPath(id);
  // Output goes straight into the clip's folder. Nothing links to it until the row is "ready", so a
  // half-written folder is never shown. (Renaming a temp folder fails on Windows while antivirus scans it.)
  const out = outputDir(id);
  const t0 = Date.now();
  try {
    const p = await probe(input);
    if (!p.durationMs) throw new Error("Couldn't read the length of this clip.");
    const startMs = Math.max(0, Math.min(video.trimStartMs ?? 0, p.durationMs - 500));
    const endMs = Math.min(video.trimEndMs ?? p.durationMs, p.durationMs, startMs + VIDEO.maxSeconds * 1000);
    const durationMs = Math.max(500, endMs - startMs);
    const coverMs = Math.min(Math.max(video.coverMs ?? startMs + Math.min(1000, durationMs / 2), startMs), endMs - 100);

    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    const renditions = await transcodeHls(input, out, { probe: p, startMs, durationMs });
    await extractPoster(input, path.join(out, "poster.jpg"), { probe: p, atMs: coverMs });
    // The real length of what was produced (exact even when the source header was wrong).
    const producedMs = (await playlistDurationMs(path.join(out, renditions[0], "index.m3u8")).catch(() => 0)) || durationMs;

    // Mark it ready, then point the posts waiting on it at the playlist.
    await db
      .update(videos)
      .set({ status: "ready", durationMs: producedMs, width: p.width, height: p.height, renditions, error: null, readyAt: new Date() })
      .where(eq(videos.id, id));
    await db
      .update(posts)
      .set({ mediaUrl: playbackUrl(id), mediaType: "video", posterUrl: posterUrlFor(id), published: true })
      .where(eq(posts.videoId, id));
    await rm(input, { force: true });
    log(`[video] ${id} ready: ${renditions.join("/")} · ${(producedMs / 1000).toFixed(1)}s clip in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    const retry = video.attempts < MAX_ATTEMPTS && !/no video/i.test(message);
    await rm(out, { recursive: true, force: true }).catch(() => {});
    await db
      .update(videos)
      .set({ status: retry ? "queued" : "failed", error: message })
      .where(eq(videos.id, id));
    log(`[video] ${id} ${retry ? "will retry" : "failed"}: ${message}`);
  }
}

/**
 * Housekeeping: uploads abandoned for a day (tab closed mid-upload), clips that never got a post (the
 * athlete backed out before posting) and clips that failed a week ago are deleted, together with any
 * unpublished posts that were waiting on them.
 */
export async function cleanupVideos(db: DB, log: (msg: string) => void = console.log) {
  const stale = await db
    .select({ id: videos.id })
    .from(videos)
    .where(
      or(
        and(eq(videos.status, "uploading"), lt(videos.createdAt, new Date(Date.now() - 24 * 3600_000))),
        and(eq(videos.status, "failed"), lt(videos.createdAt, new Date(Date.now() - 7 * 24 * 3600_000))),
        and(lt(videos.createdAt, new Date(Date.now() - 24 * 3600_000)), sql`not exists (select 1 from posts p where p.video_id = "videos"."id")`),
      ),
    )
    .limit(200);
  if (!stale.length) return;
  const ids = stale.map((v) => v.id);
  await db.delete(posts).where(and(inArray(posts.videoId, ids), eq(posts.published, false)));
  await db.delete(videos).where(inArray(videos.id, ids));
  for (const id of ids) {
    await rm(incomingPath(id), { force: true });
    await rm(outputDir(id), { recursive: true, force: true });
  }
  log(`[video] cleaned up ${ids.length} abandoned or failed upload(s)`);
}

const sleep = (ms: number, wake: { fn?: () => void }) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
    wake.fn = () => {
      clearTimeout(t);
      resolve();
    };
  });

/**
 * Processes videos one at a time until `signal` aborts. Polls every few seconds; call the returned
 * `wake()` after queueing a video to start it immediately.
 */
export function runVideoWorker(db: DB, { signal, idleMs = 4000, log = console.log }: { signal?: AbortSignal; idleMs?: number; log?: (m: string) => void } = {}) {
  const wake: { fn?: () => void } = {};
  (async () => {
    log("[video] worker started");
    let lastCleanup = 0;
    while (!signal?.aborted) {
      if (Date.now() - lastCleanup > 30 * 60_000) {
        lastCleanup = Date.now();
        await cleanupVideos(db, log).catch((e: Error) => log(`[video] cleanup failed: ${e.message}`));
      }
      let id: string | null = null;
      try {
        id = await claimNextVideo(db);
      } catch (e) {
        log(`[video] claim failed: ${(e as Error).message}`);
      }
      if (id) await processVideo(db, id, log);
      else await sleep(idleMs, wake);
    }
    log("[video] worker stopped");
  })();
  return { wake: () => wake.fn?.() };
}
