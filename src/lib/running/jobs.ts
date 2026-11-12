import type { DB } from "@/db/client";
import { runRunningJobs } from "./engine";

/**
 * Riadha Run's periodic work (Monday's Run League results, group-run recaps), started from
 * instrumentation.ts. Each job claims a key in run_digests first, so overlapping processes never post twice.
 */
export function startRunningJobs(db: DB, everyMs = 10 * 60_000) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await runRunningJobs(db);
    } catch (e) {
      console.error("[run] jobs failed:", e);
    } finally {
      busy = false;
    }
  };
  const first = setTimeout(tick, 20_000);
  const timer = setInterval(tick, everyMs);
  first.unref?.();
  timer.unref?.();
  return { stop: () => (clearTimeout(first), clearInterval(timer)), tick };
}
