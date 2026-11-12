"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloudUpload, Trash2, WifiOff } from "lucide-react";
import { saveActivity } from "@/actions/running";
import { formatDate } from "@/lib/format";
import { km } from "@/lib/running/format";
import { OUTBOX_EVENT, outbox, type PendingRun } from "@/lib/running/outbox";

const subscribe = (cb: () => void) => {
  window.addEventListener(OUTBOX_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(OUTBOX_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
let cache: { raw: string; list: PendingRun[] } = { raw: "", list: [] };
const snapshot = () => {
  const list = outbox.list();
  const raw = JSON.stringify(list.map((r) => [r.clientId, r.error]));
  if (raw !== cache.raw) cache = { raw, list };
  return cache.list;
};
const EMPTY: PendingRun[] = [];

/** Runs saved on the phone without signal. They upload by themselves when the connection is back. */
export function RunOutbox() {
  const router = useRouter();
  const pending = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const flush = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    setBusy(true);
    let saved = 0;
    for (const run of outbox.list().filter((r) => !r.error)) {
      try {
        const res = await saveActivity(run);
        if ("error" in res) outbox.markError(run.clientId, res.error);
        else {
          outbox.remove(run.clientId);
          saved++;
        }
      } catch {
        break; // still offline
      }
    }
    running.current = false;
    setBusy(false);
    if (saved) router.refresh();
  }, [router]);

  useEffect(() => {
    if (!outbox.list().length) return;
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [flush, pending.length]);

  if (!pending.length) return null;
  return (
    <section className="card overflow-hidden" aria-live="polite">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-green">{busy ? <CloudUpload size={18} className="animate-live" /> : <WifiOff size={18} />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{pending.length} run{pending.length === 1 ? "" : "s"} waiting to upload</p>
          <p className="text-[12px] text-muted">{busy ? "Uploading…" : "Saved on this phone. They upload when you're back online."}</p>
        </div>
        <button type="button" onClick={flush} disabled={busy} className="btn btn-secondary btn-sm">Upload</button>
      </div>
      <ul className="divide-y divide-line/70 border-t border-line">
        {pending.map((r) => (
          <li key={r.clientId} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
            <span className="flex-1">
              <span className="font-semibold">{r.title || "Run"}</span> · {km(r.distanceM)} km · {formatDate(r.startedAt, { weekday: "short", day: "numeric", month: "short" })}
              {r.error && <span className="block text-danger">{r.error}</span>}
            </span>
            {r.error && (
              <button type="button" aria-label="Remove" onClick={() => outbox.remove(r.clientId)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-gray-100 hover:text-danger">
                <Trash2 size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
