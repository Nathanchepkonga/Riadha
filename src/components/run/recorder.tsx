"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bike, CloudUpload, Footprints, LocateFixed, Pause, Play, PersonStanding, Satellite, Square, X } from "lucide-react";
import { saveActivity } from "@/actions/running";
import { Portal, useModal } from "@/components/ui/overlay";
import { celebrate, haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";
import { defaultTitle, duration, km, pace } from "@/lib/running/format";
import { outbox, recording, type ActiveRecording, type PendingRun } from "@/lib/running/outbox";
import { haversine, type Sport, type TrackPoint } from "@/lib/running/track";

/*
 * The in-app recorder. A web app only gets GPS while it's open, so the screen is kept awake (Wake Lock)
 * and the athlete is told to keep it on. Every few points the recording is written to the phone, so a
 * crash or a closed tab can be resumed; finished runs that can't reach the server wait in the outbox.
 */

type Phase = "ready" | "recording" | "paused" | "review" | "saving" | "queued";
type Fix = { accuracy: number; at: number } | null;

const SPORTS: { value: Sport; label: string; icon: typeof Footprints }[] = [
  { value: "run", label: "Run", icon: Footprints },
  { value: "walk", label: "Walk", icon: PersonStanding },
  { value: "ride", label: "Ride", icon: Bike },
];
const MAX_JUMP: Record<Sport, number> = { run: 12, walk: 8, ride: 30 }; // m/s between fixes
const GOOD_FIX = 35; // metres

const noop = () => () => {};

/** The recorder reads phone storage and GPS, so it only ever renders in the browser. */
export function RecordScreen() {
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? <Recorder /> : null;
}

function Recorder() {
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const [phase, setPhaseState] = useState<Phase>("ready");
  const [sport, setSport] = useState<Sport>("run");
  const [fix, setFix] = useState<Fix>(null);
  const [geoError, setGeoError] = useState<string | null>(() => ("geolocation" in navigator ? null : "This browser has no GPS access."));
  const [rec, setRecState] = useState<ActiveRecording | null>(null);
  // An unfinished recording from before (closed tab, crash, phone restart).
  const [resumable, setResumable] = useState<ActiveRecording | null>(() => {
    const saved = recording.read();
    return saved?.points.length ? saved : null;
  });
  const [now, setNow] = useState(() => Date.now());
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<ActiveRecording | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const lock = useRef<WakeLockSentinel | null>(null);
  const sinceSave = useRef(0);
  // The GPS callback reads the latest recording and phase through refs, kept in step with state here.
  const put = (r: ActiveRecording | null) => {
    recRef.current = r;
    setRecState(r);
  };
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };


  const close = useCallback(() => {
    if ((phaseRef.current === "recording" || phaseRef.current === "paused") && !window.confirm("Stop and keep this run for later? It stays on your phone until you save or discard it.")) return;
    router.push("/run");
  }, [router]);
  useModal(dialog, close);

  // GPS: watched while this screen is open, so the fix is ready before Start.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setFix({ accuracy: pos.coords.accuracy, at: pos.timestamp });
        const r = recRef.current;
        if (!r || phaseRef.current !== "recording" || pos.coords.accuracy > GOOD_FIX) return;
        const t = Math.max(0, (pos.timestamp - r.startedAt) / 1000);
        const p: TrackPoint = [pos.coords.latitude, pos.coords.longitude, Math.round(t * 10) / 10, pos.coords.altitude ?? null];
        const last = r.points[r.points.length - 1];
        let add = 0;
        if (last) {
          const d = haversine(last[0], last[1], p[0], p[1]);
          const dt = p[2] - last[2];
          if (dt <= 0 || (d / dt > MAX_JUMP[r.sport] && d > 25)) return; // GPS jump
          if (d < 2 && dt < 15) return; // standing still
          add = d;
        }
        const next = { ...r, points: [...r.points, p], distanceM: r.distanceM + add };
        put(next);
        if (++sinceSave.current >= 5) {
          sinceSave.current = 0;
          recording.save(next);
        }
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? "Location is blocked. Allow location for Riadha in your browser settings, then come back." : "Can't get a GPS fix. Step outside, away from tall buildings."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // The clock, and the screen kept awake while recording.
  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const awake = async () => {
      try {
        if (document.visibilityState === "visible" && !lock.current) lock.current = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* not supported or refused: the tip on screen covers it */
      }
    };
    void awake();
    const onVis = () => {
      lock.current = null;
      void awake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      void lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [phase]);

  const start = () => {
    const r: ActiveRecording = { clientId: crypto.randomUUID(), sport, startedAt: Date.now(), pausedMs: 0, pausedAt: null, points: [], distanceM: 0 };
    put(r);
    recording.save(r);
    go("recording");
    setNow(Date.now());
    haptic(30);
  };
  const pause = () => {
    if (!rec) return;
    const r = { ...rec, pausedAt: Date.now() };
    put(r);
    recording.save(r);
    go("paused");
    haptic(15);
  };
  const resume = () => {
    if (!rec) return;
    const r = { ...rec, pausedMs: rec.pausedMs + (rec.pausedAt ? Date.now() - rec.pausedAt : 0), pausedAt: null };
    put(r);
    recording.save(r);
    go("recording");
    haptic(15);
  };
  const finish = () => {
    if (!rec) return;
    const r = rec.pausedAt ? rec : { ...rec, pausedAt: Date.now() };
    put(r);
    recording.save(r);
    setTitle(defaultTitle(r.sport, new Date(r.startedAt)));
    go("review");
  };
  const restore = (r: ActiveRecording, review = false) => {
    const paused = { ...r, pausedAt: r.pausedAt ?? Date.now() };
    put(paused);
    setSport(r.sport);
    setResumable(null);
    if (review) setTitle(defaultTitle(r.sport, new Date(r.startedAt)));
    go(review ? "review" : "paused");
  };
  const discard = () => {
    if (!window.confirm("Discard this run? It can't be recovered.")) return;
    recording.clear();
    put(null);
    setResumable(null);
    go("ready");
  };

  async function save() {
    if (!rec) return;
    const payload: PendingRun = {
      sport: rec.sport,
      source: "recorded",
      startedAt: new Date(rec.startedAt).toISOString(),
      points: rec.points,
      title: title.trim() || null,
      isPrivate,
      device: "Riadha recorder",
      clientId: rec.clientId,
      queuedAt: Date.now(),
      distanceM: Math.round(rec.distanceM),
    };
    setError(null);
    go("saving");
    try {
      const res = await saveActivity(payload);
      if ("error" in res) {
        setError(res.error);
        go("review");
        return;
      }
      recording.clear();
      celebrate();
      router.push(`/run/a/${res.id}?new=1`);
    } catch {
      // No signal: keep it on the phone and upload later.
      outbox.add(payload);
      recording.clear();
      go("queued");
    }
  }

  const movingMs = rec ? (rec.pausedAt ?? now) - rec.startedAt - rec.pausedMs : 0;
  const avgPace = rec && rec.distanceM > 50 ? movingMs / rec.distanceM : 0;
  const currentPace = useMemo(() => {
    const pts = rec?.points ?? [];
    if (pts.length < 2) return 0;
    const last = pts[pts.length - 1];
    let d = 0;
    let k = pts.length - 1;
    while (k > 0 && last[2] - pts[k - 1][2] <= 30) {
      d += haversine(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]);
      k--;
    }
    const dt = last[2] - pts[k][2];
    return d > 20 && dt > 0 ? (dt / d) * 1000 : 0;
  }, [rec?.points]);
  const ready = !!fix && fix.accuracy <= GOOD_FIX;
  const tooShort = !rec || rec.points.length < 10 || rec.distanceM < 100;

  return (
    <Portal>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Record an activity" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-navy pb-[calc(1.25rem+var(--sab))] pl-[calc(1.25rem+var(--sal))] pr-[calc(1.25rem+var(--sar))] pt-[calc(1rem+var(--sat))] text-white">
        <div className="pointer-events-none fixed inset-0" aria-hidden>
          <div className="absolute -right-24 top-0 h-[140%] w-40 origin-top -skew-x-[37.57deg] bg-cobalt/15" />
          <div className="absolute right-24 top-0 h-[140%] w-6 origin-top -skew-x-[37.57deg] bg-green/10" />
        </div>
        <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col">
          <header className="flex items-center justify-between">
            <button type="button" onClick={close} aria-label="Close" className="pressable grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <X size={20} />
            </button>
            <GpsChip fix={fix} error={geoError} />
          </header>

          {resumable && phase === "ready" ? (
            <div className="my-auto rounded-3xl bg-navy-2 p-5 ring-1 ring-white/10">
              <p className="kicker text-green">Unfinished run</p>
              <p className="mt-2 text-[22px] font-bold tracking-[-0.02em]">
                {km(resumable.distanceM)} km from {new Date(resumable.startedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="mt-1 text-[14px] text-white/65">Riadha kept it on your phone. Carry on, or save it now.</p>
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={() => restore(resumable)} className="btn btn-accent btn-block">Carry on</button>
                <button type="button" onClick={() => restore(resumable, true)} className="btn btn-light btn-block">Finish and save</button>
                <button type="button" onClick={discard} className="btn btn-ghost btn-block text-white/70">Discard</button>
              </div>
            </div>
          ) : phase === "review" || phase === "saving" ? (
            <div className="my-auto">
              <p className="kicker text-green">Nice work</p>
              <p className="mt-1 text-[clamp(44px,14vw,64px)] font-bold leading-none tracking-[-0.05em] tabular">
                {km(rec?.distanceM ?? 0)}<span className="ml-2 text-[20px] text-white/55">km</span>
              </p>
              <p className="mt-2 text-[15px] text-white/70 tabular">
                {duration(movingMs / 1000)} · {pace(avgPace)}/km
              </p>
              <label className="mt-6 block">
                <span className="label text-white/60">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="field border-white/15 bg-white/5 text-white" />
              </label>
              <label className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-[14px]">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4 accent-[#B7F34A]" />
                <span>
                  <span className="block font-semibold">Only me</span>
                  <span className="text-[12px] text-white/55">Still counts for your leagues and challenges, but no post.</span>
                </span>
              </label>
              {error && <p role="alert" className="mt-3 rounded-xl bg-danger/20 px-4 py-3 text-[14px]">{error}</p>}
              {tooShort && <p className="mt-3 text-[13px] text-white/60">This is too short to save (100 m minimum).</p>}
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={save} disabled={phase === "saving" || tooShort} className="btn btn-accent btn-lg btn-block">
                  {phase === "saving" ? "Saving…" : "Save"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={resume} disabled={phase === "saving"} className="btn btn-light">Keep going</button>
                  <button type="button" onClick={discard} disabled={phase === "saving"} className="btn btn-ghost text-white/70">Discard</button>
                </div>
              </div>
            </div>
          ) : phase === "queued" ? (
            <div className="my-auto text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green text-navy"><CloudUpload size={28} /></span>
              <p className="mt-4 text-[24px] font-bold tracking-[-0.02em]">Saved on your phone</p>
              <p className="mx-auto mt-2 max-w-[30ch] text-[14px] text-white/65">No connection right now. It uploads by itself the next time you open Riadha Run with signal.</p>
              <button type="button" onClick={() => router.push("/run")} className="btn btn-accent mt-6">Done</button>
            </div>
          ) : (
            <>
              {phase === "ready" && (
                <div className="mt-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sport">
                  {SPORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={sport === s.value}
                      onClick={() => setSport(s.value)}
                      className={cn("pressable flex flex-col items-center gap-1 rounded-2xl py-3 text-[13px] font-semibold", sport === s.value ? "bg-green text-navy" : "bg-white/10 text-white/80")}
                    >
                      <s.icon size={20} /> {s.label}
                    </button>
                  ))}
                </div>
              )}

              <LiveShape points={rec?.points ?? []} />

              <dl className="mt-auto grid grid-cols-2 gap-y-5 text-center">
                <div className="col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Distance</dt>
                  <dd className="text-[clamp(64px,22vw,104px)] font-bold leading-none tracking-[-0.06em] tabular">{km(rec?.distanceM ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Time</dt>
                  <dd className="text-[30px] font-bold tracking-[-0.04em] tabular">{duration(movingMs / 1000)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{sport === "ride" ? "Speed" : "Pace"}</dt>
                  <dd className="text-[30px] font-bold tracking-[-0.04em] tabular">
                    {sport === "ride" ? (currentPace ? (3600 / currentPace).toFixed(1) : "–") : pace(currentPace)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex items-center justify-center gap-4">
                {phase === "ready" && (
                  <button type="button" onClick={start} disabled={!!geoError} className={cn("pressable grid h-24 w-24 place-items-center rounded-full text-[17px] font-bold text-navy shadow-[0_0_40px_-6px_rgba(183,243,74,.7)]", ready ? "bg-green" : "bg-green/70")}>
                    Start
                  </button>
                )}
                {phase === "recording" && (
                  <button type="button" onClick={pause} aria-label="Pause" className="pressable grid h-24 w-24 place-items-center rounded-full bg-white text-navy">
                    <Pause size={34} fill="currentColor" />
                  </button>
                )}
                {phase === "paused" && (
                  <>
                    <button type="button" onClick={resume} aria-label="Resume" className="pressable grid h-20 w-20 place-items-center rounded-full bg-green text-navy">
                      <Play size={30} fill="currentColor" />
                    </button>
                    <button type="button" onClick={finish} aria-label="Finish" className="pressable grid h-20 w-20 place-items-center rounded-full bg-white text-navy">
                      <Square size={26} fill="currentColor" />
                    </button>
                  </>
                )}
              </div>
              <p className="mt-5 text-center text-[12px] text-white/55">
                {phase === "ready" && !ready && !geoError ? "Waiting for a strong GPS signal. You can start anyway." : "Keep this screen open: phones pause GPS for web apps when the screen locks."}
              </p>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

function GpsChip({ fix, error }: { fix: Fix; error: string | null }) {
  if (error) return <span className="max-w-[70%] rounded-full bg-danger/25 px-3 py-1.5 text-right text-[12px] font-semibold">{error}</span>;
  if (!fix) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold">
        <Satellite size={14} className="animate-live" /> Finding GPS…
      </span>
    );
  }
  const good = fix.accuracy <= GOOD_FIX;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold", good ? "bg-green text-navy" : "bg-warning/30")}>
      <LocateFixed size={14} /> {good ? "GPS ready" : "Weak GPS"} ±{Math.round(fix.accuracy)} m
    </span>
  );
}

/** The shape drawn so far, scaled to fit (no map). */
function LiveShape({ points }: { points: TrackPoint[] }) {
  if (points.length < 2) return <div className="mt-6 h-[28vh]" aria-hidden />;
  const lat0 = points[0][0];
  const cos = Math.cos((lat0 * Math.PI) / 180);
  const xy = points.map((p) => [p[1] * cos, -p[0]] as const);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(maxX - minX, maxY - minY, 1e-5);
  const line = xy.map((p) => `${((p[0] - minX) / span) * 100},${((p[1] - minY) / span) * 100}`).join(" ");
  const last = line.split(" ").pop()!.split(",");
  return (
    <svg viewBox="-10 -10 120 120" className="mx-auto mt-6 h-[28vh] w-full" aria-hidden>
      <polyline points={line} fill="none" stroke="#B7F34A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="#FFFFFF" />
    </svg>
  );
}
