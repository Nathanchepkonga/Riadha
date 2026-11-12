"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { saveActivity } from "@/actions/running";
import type { RouteArt as Art } from "@/db/schema";
import { celebrate } from "@/lib/celebrate";
import { cn, formatDate } from "@/lib/format";
import { SPORT_LABEL, defaultTitle, duration, km, paceOrSpeed } from "@/lib/running/format";
import { ACCEPT, parseActivityFile, type ParsedActivity } from "@/lib/running/parse";
import { analyseTrack, routeArt, type Sport, type TrackPoint } from "@/lib/running/track";
import { RouteArt } from "./route-art";

type Item = {
  key: string;
  file: string;
  status: "parsing" | "ready" | "saving" | "saved" | "failed";
  parsed?: ParsedActivity;
  points?: TrackPoint[];
  stats?: { distanceM: number; movingS: number };
  art?: Art | null;
  sport: Sport;
  title: string;
  isPrivate: boolean;
  error?: string;
  result?: { id: number; prs: number; completed: string[]; duplicate?: boolean };
};

/** Upload GPX, TCX or FIT files from a watch or another app: read on the phone, previewed, then saved. */
export function UploadRuns() {
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const patch = (key: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const fresh: Item[] = [...files].slice(0, 20).map((f) => ({ key: `${f.name}-${f.size}-${f.lastModified}`, file: f.name, status: "parsing", sport: "run", title: "", isPrivate: false }));
    setItems((cur) => [...cur.filter((c) => !fresh.some((f) => f.key === c.key)), ...fresh]);
    for (const [n, f] of [...files].slice(0, 20).entries()) {
      const key = fresh[n].key;
      try {
        const parsed = await parseActivityFile(f);
        const a = analyseTrack(parsed.points, parsed.sport);
        if ("error" in a) throw new Error(a.error);
        patch(key, {
          status: "ready",
          parsed,
          points: a.points,
          stats: { distanceM: a.distanceM, movingS: a.movingS },
          art: routeArt(a.points),
          sport: parsed.sport,
          title: parsed.name ?? defaultTitle(parsed.sport, parsed.startedAt),
        });
      } catch (e) {
        patch(key, { status: "failed", error: (e as Error).message || "We couldn't read this file." });
      }
    }
  }

  async function saveAll() {
    setSaving(true);
    let wins = 0;
    for (const it of items.filter((i) => i.status === "ready")) {
      patch(it.key, { status: "saving" });
      try {
        const res = await saveActivity({
          sport: it.sport,
          source: it.parsed!.source,
          startedAt: it.parsed!.startedAt.toISOString(),
          points: it.points!,
          title: it.title,
          isPrivate: it.isPrivate,
          device: it.parsed!.device,
          clientId: `${it.parsed!.source}-${it.parsed!.startedAt.getTime()}`,
        });
        if ("error" in res) patch(it.key, { status: "failed", error: res.error, result: res.existingId ? { id: res.existingId, prs: 0, completed: [], duplicate: true } : undefined });
        else {
          wins += res.prs.length + res.completed.length;
          patch(it.key, { status: "saved", result: { id: res.id, prs: res.prs.length, completed: res.completed.map((c) => c.title), duplicate: res.duplicate } });
        }
      } catch {
        patch(it.key, { status: "ready", error: "No connection. Try again when you're online." });
        break;
      }
    }
    setSaving(false);
    if (wins) celebrate();
  }

  const ready = items.filter((i) => i.status === "ready").length;
  return (
    <div className="flex flex-col gap-4">
      <label className="pressable edge-glow relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-3xl bg-navy p-5 text-white">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-green text-navy">
          <FileUp size={26} />
        </span>
        <span>
          <span className="block text-[18px] font-bold tracking-[-0.02em]">Choose files</span>
          <span className="text-[13px] text-white/65">GPX, TCX or FIT from Garmin, Coros, Huawei, Samsung, Polar, Suunto… up to 20 at once</span>
        </span>
        <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => void pick(e.target.files)} />
      </label>

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.key} className="card overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy">
                  {it.status === "parsing" ? <Loader2 size={20} className="animate-spin text-white/60" /> : it.art ? <RouteArt art={it.art} width={22} className="h-full w-full" /> : <FileUp size={20} className="text-white/40" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-muted">{it.file}</p>
                  {it.parsed && it.stats ? (
                    <>
                      <p className="mt-0.5 text-[15px] font-semibold">
                        {km(it.stats.distanceM)} km · {duration(it.stats.movingS)}
                        <span className="font-normal text-muted"> · {paceOrSpeed(it.sport, it.stats.distanceM, it.stats.movingS).value}{it.sport === "ride" ? " km/h" : "/km"}</span>
                      </p>
                      <p className="text-[12px] text-muted">
                        {formatDate(it.parsed.startedAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        {it.parsed.device ? ` · ${it.parsed.device}` : ""}
                      </p>
                    </>
                  ) : (
                    it.status === "parsing" && <p className="mt-1 text-[14px] text-muted">Reading…</p>
                  )}
                  {it.error && (
                    <p className="mt-1 flex items-start gap-1.5 text-[13px] text-danger">
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {it.error}
                    </p>
                  )}
                  {it.status === "saved" && it.result && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
                      <CheckCircle2 size={15} className="text-navy" /> {it.result.duplicate ? "Already saved" : "Saved"}
                      {it.result.prs > 0 && <span className="rounded-full bg-green px-2 py-0.5 text-[11px] text-navy">{it.result.prs} new PR{it.result.prs === 1 ? "" : "s"}</span>}
                      {it.result.completed.map((c) => <span key={c} className="rounded-full bg-cobalt px-2 py-0.5 text-[11px] text-white">Finished {c}</span>)}
                      <Link href={`/run/a/${it.result.id}`} className="ml-auto text-cobalt">Open →</Link>
                    </p>
                  )}
                  {it.status === "failed" && it.result?.duplicate && (
                    <Link href={`/run/a/${it.result.id}`} className="mt-1 inline-block text-[13px] font-semibold text-cobalt">Open the saved one →</Link>
                  )}
                </div>
              </div>
              {(it.status === "ready" || it.status === "saving") && (
                <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-line p-3">
                  <input value={it.title} onChange={(e) => patch(it.key, { title: e.target.value })} maxLength={80} aria-label="Title" className="field" />
                  <select value={it.sport} onChange={(e) => patch(it.key, { sport: e.target.value as Sport })} aria-label="Sport" className="field w-auto">
                    {(Object.keys(SPORT_LABEL) as Sport[]).map((s) => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
                  </select>
                  <label className="col-span-2 flex items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={it.isPrivate} onChange={(e) => patch(it.key, { isPrivate: e.target.checked })} className="h-4 w-4 accent-[#081018]" />
                    Only me (no post; still counts for leagues and challenges)
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button type="button" onClick={saveAll} disabled={!ready || saving} className={cn("btn btn-primary btn-lg btn-block", !ready && "opacity-60")}>
          {saving ? "Saving…" : ready ? `Save ${ready} activit${ready === 1 ? "y" : "ies"}` : "Nothing left to save"}
        </button>
      )}
      <p className="text-[12px] text-muted">
        Files are read on your phone and only the route points are sent. Your route is shown as a shape with the first and last 200 m cut off (and your private places hidden), never on a map.
      </p>
    </div>
  );
}
