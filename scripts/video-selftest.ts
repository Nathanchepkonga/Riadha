/**
 * Checks the video pipeline end to end on this machine: FFmpeg works, the worker transcodes a clip to
 * HLS with a poster, and the database row ends up "ready". Uses a generated test pattern (no real
 * media) and cleans up after itself.
 *
 *   npm run video:selftest
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import ffmpegStatic from "ffmpeg-static";
import { createDb } from "../src/db/client";
import { users, videos } from "../src/db/schema";
import { incomingPath, outputDir } from "../src/lib/video/paths";
import { processVideo } from "../src/lib/video/worker";

async function main() {
  const { db, client } = createDb(process.env.DATABASE_URL, 2);
  let id: string | null = null;
  try {
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).limit(1);
    if (!owner) throw new Error("No admin user to own the test clip. Seed the database first.");

    // 12s portrait test pattern with a tone, like a phone clip.
    const [v] = await db.insert(videos).values({ ownerId: owner.id, mimeType: "video/mp4", sizeBytes: 1, status: "processing", trimStartMs: 1000, trimEndMs: 9000, coverMs: 4000, attempts: 1 }).returning();
    id = v.id;
    await mkdir(path.dirname(incomingPath(id)), { recursive: true });
    const ff = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
    const gen = spawnSync(ff, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "12", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-f", "mp4", incomingPath(id)]);
    if (gen.status !== 0) throw new Error(`FFmpeg could not generate the test clip: ${gen.stderr}`);
    const size = (await stat(incomingPath(id))).size;
    await db.update(videos).set({ sizeBytes: size, receivedBytes: size }).where(eq(videos.id, id));

    const t0 = Date.now();
    await processVideo(db, id);
    const [after] = await db.select().from(videos).where(eq(videos.id, id));
    if (after.status !== "ready") throw new Error(`Processing ended as "${after.status}": ${after.error}`);

    const files = (await readdir(outputDir(id), { recursive: true })).map(String).sort();
    const master = await readFile(path.join(outputDir(id), "master.m3u8"), "utf8");
    console.log(`OK in ${((Date.now() - t0) / 1000).toFixed(1)}s · ${after.width}x${after.height} · ${((after.durationMs ?? 0) / 1000).toFixed(1)}s (trimmed from 12s) · ${after.renditions.join(", ")}`);
    console.log(`${files.length} files: ${files.filter((f) => !f.includes("seg_")).join(", ")} + ${files.filter((f) => f.includes("seg_")).length} segments`);
    console.log(master.trim());
  } finally {
    if (id) {
      await db.delete(videos).where(eq(videos.id, id));
      await rm(outputDir(id), { recursive: true, force: true });
      await rm(incomingPath(id), { force: true });
    }
    await client.end();
  }
}

main().catch((e) => {
  console.error("Video self-test FAILED:", (e as Error).message);
  process.exitCode = 1;
});
