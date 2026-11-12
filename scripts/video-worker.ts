/**
 * Standalone video worker: `npm run worker:video`. Use it when the web server runs with VIDEO_WORKER=off,
 * or to add transcoding capacity (several workers can run at once; jobs are claimed with SKIP LOCKED).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createDb } from "../src/db/client";
import { runVideoWorker } from "../src/lib/video/worker";

const { db, client } = createDb(process.env.DATABASE_URL, 2);
const stop = new AbortController();
runVideoWorker(db, { signal: stop.signal });

const shutdown = () => {
  stop.abort();
  // Let an in-flight transcode be retried by the next worker; don't wait for it.
  client.end({ timeout: 2 }).finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// Keep the process alive while idle (the worker's own timers are unref'd).
setInterval(() => {}, 1 << 30);
