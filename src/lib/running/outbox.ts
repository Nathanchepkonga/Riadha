"use client";

import type { ActivityInput } from "./engine";
import type { Sport, TrackPoint } from "./track";

/*
 * Runs live on the phone until the server has them: the recording in progress (so a crash or a closed tab
 * loses nothing) and an outbox of finished runs waiting for signal. Each run carries a clientId, so a retry
 * after a lost response never saves it twice. Storage can be unavailable (private mode): every access is
 * guarded and the recorder still works, it just can't survive a reload.
 */

const OUTBOX = "riadha:run:outbox";
const ACTIVE = "riadha:run:active";

export type PendingRun = ActivityInput & { clientId: string; queuedAt: number; distanceM: number; error?: string };

export type ActiveRecording = {
  clientId: string;
  sport: Sport;
  startedAt: number;
  /** Total time spent paused so far (ms) and when the current pause began. */
  pausedMs: number;
  pausedAt: number | null;
  points: TrackPoint[];
  distanceM: number;
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(OUTBOX_EVENT));
    return true;
  } catch {
    return false;
  }
}

export const OUTBOX_EVENT = "riadha:run-outbox";

export const outbox = {
  list: () => read<PendingRun[]>(OUTBOX, []),
  add(run: PendingRun) {
    return write(OUTBOX, [...outbox.list().filter((r) => r.clientId !== run.clientId), run]);
  },
  remove(clientId: string) {
    write(OUTBOX, outbox.list().filter((r) => r.clientId !== clientId));
  },
  markError(clientId: string, error: string) {
    write(OUTBOX, outbox.list().map((r) => (r.clientId === clientId ? { ...r, error } : r)));
  },
};

export const recording = {
  read: () => read<ActiveRecording | null>(ACTIVE, null),
  save: (r: ActiveRecording) => write(ACTIVE, r),
  clear: () => write(ACTIVE, null),
};

/** Whether a failed save was a connection problem (worth queueing) rather than a rejection. */
export function isOffline(e: unknown) {
  return !navigator.onLine || e instanceof TypeError || /fetch|network|load failed/i.test(String((e as Error)?.message ?? ""));
}
