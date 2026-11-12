"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Grid3x3, ImagePlus, RotateCcw, SwitchCamera, Timer, X, Zap, ZapOff } from "lucide-react";
import { Portal, useModal } from "@/components/ui/overlay";
import { VIDEO } from "@/lib/video/config";
import { haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";

type Facing = "user" | "environment";
type Phase = "starting" | "ready" | "countdown" | "recording" | "paused" | "error";

const MIME_CANDIDATES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const pickMime = () => (typeof MediaRecorder === "undefined" ? "" : (MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? ""));
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/**
 * Full-screen in-app camera (TikTok pattern). Tap the shutter to start/pause, or hold it to record while
 * held; record several takes into one clip; a 3s/10s countdown lets athletes film themselves. The result
 * goes to the editor. When the browser can't open the camera, it offers the phone's own camera app.
 */
export function CameraCapture({ onClose, onCaptured, onPickFile }: { onClose: () => void; onCaptured: (file: File, durationMs: number) => void; onPickFile: (file: File) => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog, onClose);
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const clock = useRef({ startedAt: 0, banked: 0 });
  const raf = useRef(0);
  const pressAt = useRef(0);

  const [facing, setFacing] = useState<Facing>("environment");
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(VIDEO.cameraLimits[1]);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [marks, setMarks] = useState<number[]>([]);
  const [grid, setGrid] = useState(false);
  const [torch, setTorch] = useState<boolean | null>(null); // null = not supported

  const elapsedNow = () => clock.current.banked + (clock.current.startedAt ? performance.now() - clock.current.startedAt : 0);

  // Open (or re-open after a flip) the camera.
  useEffect(() => {
    let stopped = false;
    async function open() {
      setPhase("starting");
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("This browser can't record here. Use your phone's camera instead.");
        setPhase("error");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30, max: 60 } },
          audio: true,
        });
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (preview.current) preview.current.srcObject = s;
        const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorch(caps.torch ? false : null);
        setPhase("ready");
      } catch (e) {
        const name = (e as DOMException).name;
        setError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow the camera and microphone for Riadha in your browser settings, or use your phone's camera."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "The camera couldn't start. Close other apps using it and try again.",
        );
        setPhase("error");
      }
    }
    open();
    return () => {
      stopped = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [facing]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = useCallback(() => {
    const ms = elapsedNow();
    setElapsed(ms);
    if (ms >= limit * 1000) {
      pause();
      return;
    }
    raf.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  function begin() {
    const s = stream.current;
    if (!s) return;
    if (!recorder.current) {
      const mimeType = pickMime();
      const r = new MediaRecorder(s, { mimeType: mimeType || undefined, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 });
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.start(1000);
      recorder.current = r;
    } else if (recorder.current.state === "paused") {
      recorder.current.resume();
    }
    clock.current.startedAt = performance.now();
    setPhase("recording");
    haptic(12);
    raf.current = requestAnimationFrame(tick);
  }

  function pause() {
    const r = recorder.current;
    if (!r || r.state !== "recording") return;
    r.pause();
    cancelAnimationFrame(raf.current);
    clock.current.banked = elapsedNow();
    clock.current.startedAt = 0;
    setElapsed(clock.current.banked);
    setMarks((m) => [...m, clock.current.banked]);
    setPhase("paused");
    haptic(8);
  }

  function start() {
    if (elapsedNow() >= limit * 1000) return;
    if (!timer) return begin();
    setPhase("countdown");
    let n = timer;
    setCount(n);
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        begin();
      } else {
        setCount(n);
        haptic(4);
      }
    }, 1000);
  }

  function finish() {
    const r = recorder.current;
    if (!r) return;
    pause();
    const durationMs = Math.round(clock.current.banked);
    r.onstop = () => {
      const type = (r.mimeType || "video/webm").split(";")[0];
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File(chunks.current, `riadha-${Date.now()}.${ext}`, { type });
      recorder.current = null;
      onCaptured(file, durationMs);
    };
    r.stop();
  }

  function retake() {
    const r = recorder.current;
    if (r && r.state !== "inactive") {
      r.onstop = null;
      r.stop();
    }
    recorder.current = null;
    chunks.current = [];
    clock.current = { startedAt: 0, banked: 0 };
    setElapsed(0);
    setMarks([]);
    setPhase("ready");
  }

  async function toggleTorch() {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  }

  // Shutter: a quick tap toggles recording; holding records only while pressed.
  const onShutterDown = () => {
    pressAt.current = performance.now();
    if (phase === "ready" || phase === "paused") start();
    else if (phase === "recording") pause();
  };
  const onShutterUp = () => {
    if (phase === "recording" && performance.now() - pressAt.current > 400) pause();
  };

  const recording = phase === "recording";
  const hasFootage = elapsed > 0;
  const progress = Math.min(1, elapsed / (limit * 1000));

  return (
    <Portal>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Camera" className="fixed inset-0 z-[70] overflow-hidden bg-black text-white">
        <video ref={preview} autoPlay playsInline muted className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "-scale-x-100")} />
        {grid && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border border-white/20" />
            ))}
          </div>
        )}

        {/* Segment progress */}
        <div className="absolute inset-x-3 top-[calc(var(--sat)+0.5rem)] h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-green transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
          {marks.map((m) => (
            <span key={m} className="absolute top-0 h-full w-0.5 bg-black" style={{ left: `${(m / (limit * 1000)) * 100}%` }} />
          ))}
        </div>

        {/* Top controls */}
        <div className="absolute inset-x-0 top-[calc(var(--sat)+1.25rem)] z-10 flex items-start justify-between px-3">
          <button type="button" onClick={onClose} aria-label="Close camera" className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur">
            <X size={22} />
          </button>
          {hasFootage && <span className="mt-2 rounded-full bg-black/45 px-3 py-1 text-[13px] font-semibold tabular backdrop-blur">{fmt(elapsed)} / {fmt(limit * 1000)}</span>}
          <div className="flex flex-col gap-2">
            <button type="button" disabled={recording || hasFootage} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Flip camera" className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur disabled:opacity-40">
              <SwitchCamera size={21} />
            </button>
            <button type="button" onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))} aria-label={`Countdown: ${timer ? `${timer} seconds` : "off"}`} className="relative grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur">
              <Timer size={21} className={timer ? "text-green" : undefined} />
              {timer > 0 && <span className="absolute -bottom-1 -right-1 rounded-full bg-green px-1 text-[10px] font-bold text-navy">{timer}s</span>}
            </button>
            {torch !== null && (
              <button type="button" onClick={toggleTorch} aria-label={torch ? "Torch off" : "Torch on"} aria-pressed={torch} className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur">
                {torch ? <Zap size={21} className="text-green" /> : <ZapOff size={21} />}
              </button>
            )}
            <button type="button" onClick={() => setGrid((g) => !g)} aria-label="Grid" aria-pressed={grid} className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur">
              <Grid3x3 size={20} className={grid ? "text-green" : undefined} />
            </button>
          </div>
        </div>

        {phase === "countdown" && (
          <div aria-live="assertive" className="absolute inset-0 grid place-items-center bg-black/25">
            <span key={count} className="animate-scale-in text-[140px] font-bold leading-none tracking-[-0.06em] text-green">{count}</span>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-navy px-8 text-center">
            <div>
              <p className="text-[20px] font-bold">Camera unavailable</p>
              <p className="mt-2 text-[14px] text-white/70">{error}</p>
              <label className="btn btn-accent btn-lg mt-6 cursor-pointer">
                Use my phone&apos;s camera
                <input type="file" accept="video/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])} />
              </label>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className={cn("absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[calc(var(--sab)+1.5rem)] pt-16", phase === "error" && "hidden")}>
          {!hasFootage && phase !== "error" && (
            <div className="mb-5 flex justify-center gap-2" role="radiogroup" aria-label="Clip length">
              {VIDEO.cameraLimits.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={limit === s} onClick={() => setLimit(s)} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors", limit === s ? "bg-white text-navy" : "bg-black/35 text-white/80 backdrop-blur")}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            {hasFootage ? (
              <button type="button" onClick={retake} disabled={recording} className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur disabled:opacity-40" aria-label="Retake">
                <RotateCcw size={22} />
              </button>
            ) : (
              <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-xl border-2 border-white/80 bg-black/35 backdrop-blur" aria-label="Choose from gallery">
                <ImagePlus size={22} />
                <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])} />
              </label>
            )}
            <button
              type="button"
              disabled={phase === "starting" || phase === "error" || phase === "countdown"}
              onPointerDown={onShutterDown}
              onPointerUp={onShutterUp}
              onPointerLeave={onShutterUp}
              aria-label={recording ? "Pause recording" : hasFootage ? "Resume recording" : "Start recording"}
              className="relative grid h-20 w-20 place-items-center rounded-full border-[5px] border-white/90 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className={cn("block bg-green transition-all duration-300 ease-[var(--ease-spring)]", recording ? "h-8 w-8 rounded-lg" : "h-[60px] w-[60px] rounded-full")} />
            </button>
            {hasFootage ? (
              <button type="button" onClick={finish} disabled={recording || elapsed < 1000} className="grid h-12 w-12 place-items-center rounded-full bg-green text-navy disabled:opacity-40" aria-label="Done">
                <Check size={24} strokeWidth={3} />
              </button>
            ) : (
              <span className="h-12 w-12" />
            )}
          </div>
          <p className="mt-3 text-center text-[12px] text-white/60">{recording ? "Tap to pause, or let go if you're holding" : hasFootage ? "Tap to record another take" : "Tap to record, or hold"}</p>
        </div>
      </div>
    </Portal>
  );
}
