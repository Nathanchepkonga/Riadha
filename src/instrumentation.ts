/**
 * Starts the in-process background work when the Node.js server boots (dev and `next start`): the video
 * worker (one clip at a time) and Riadha Run's periodic jobs (weekly results, group-run recaps). Set
 * VIDEO_WORKER=off to run the video worker as a separate process instead (`npm run worker:video`), and
 * RUN_JOBS=off to switch the running jobs off (e.g. on all but one server).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const g = globalThis as unknown as { riadhaVideoWorker?: { wake: () => void }; riadhaRunJobs?: { stop: () => void } };
  const wantVideo = process.env.VIDEO_WORKER !== "off" && !g.riadhaVideoWorker;
  const wantRun = process.env.RUN_JOBS !== "off" && !g.riadhaRunJobs;
  if (!wantVideo && !wantRun) return;
  const { createDb } = await import("./db/client");
  // A small pool of its own, so long transcodes and jobs never hold the web server's connections.
  const { db } = createDb(process.env.DATABASE_URL, 2);
  if (wantVideo) {
    const { runVideoWorker } = await import("./lib/video/worker");
    g.riadhaVideoWorker = runVideoWorker(db);
  }
  if (wantRun) {
    const { startRunningJobs } = await import("./lib/running/jobs");
    g.riadhaRunJobs = startRunningJobs(db);
  }
}
