"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Pause, Play } from "lucide-react";
import { Portal, useModal } from "@/components/ui/overlay";
import { VIDEO } from "@/lib/video/config";
import type { VideoEdits } from "@/lib/video/uploads";
import { cn } from "@/lib/format";

const FRAMES = 8;
const MIN_MS = 1000;
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;

/** Draws the current frame of a video into a JPEG data URL, `width` pixels wide. */
function grab(video: HTMLVideoElement, width: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth));
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function seek(video: HTMLVideoElement, seconds: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = seconds;
  });
}

/**
 * Trim and cover picker. Edits are instructions (start/end/cover times); the phone's compressor or the
 * server applies them, so this screen stays light even on cheap phones.
 */
export function VideoEditor({ file, durationHintMs, onBack, onNext }: { file: File; durationHintMs?: number; onBack: () => void; onNext: (edits: VideoEdits, coverDataUrl: string | null) => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog, onBack);
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [cover, setCover] = useState(0);
  const [mode, setMode] = useState<"trim" | "cover">("trim");
  const [playing, setPlaying] = useState(true);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const maxMs = VIDEO.maxSeconds * 1000;

  // Duration (recorded WebM files report Infinity until forced to the end) and the filmstrip.
  useEffect(() => {
    let cancelled = false;
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";
    probe.src = url;
    const ready = async () => {
      let d = probe.duration;
      if (!Number.isFinite(d) || d <= 0) {
        if (durationHintMs) d = durationHintMs / 1000;
        else {
          await seek(probe, 1e7);
          d = Number.isFinite(probe.duration) ? probe.duration : probe.currentTime;
        }
      }
      if (cancelled) return;
      const ms = Math.round(d * 1000);
      setDuration(ms);
      setEnd(Math.min(ms, maxMs));
      setCover(Math.min(1000, ms / 2));
      const shots: string[] = [];
      for (let i = 0; i < FRAMES; i++) {
        await seek(probe, ((i + 0.5) * d) / FRAMES);
        if (cancelled) return;
        shots.push(grab(probe, 72));
        setFrames([...shots]);
      }
    };
    probe.addEventListener("loadedmetadata", ready, { once: true });
    return () => {
      cancelled = true;
      probe.removeAttribute("src");
      probe.load();
    };
  }, [url, durationHintMs, maxMs]);

  // Loop the preview inside the trim range.
  useEffect(() => {
    const v = video.current;
    if (!v || !duration) return;
    const onTime = () => {
      setNow(v.currentTime * 1000);
      if (mode === "trim" && v.currentTime * 1000 >= end - 30) v.currentTime = start / 1000;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, end, duration, mode]);

  const pct = (ms: number) => (duration ? (ms / duration) * 100 : 0);

  function drag(which: "start" | "end") {
    return (e: React.PointerEvent) => {
      const el = track.current;
      if (!el || !duration) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* window listeners below still track the drag */
      }
      const move = (ev: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const ms = Math.round(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * duration);
        if (which === "start") {
          const s = Math.min(Math.max(0, ms), end - MIN_MS);
          setStart(Math.max(s, end - maxMs));
          if (video.current) video.current.currentTime = s / 1000;
        } else {
          const en = Math.max(Math.min(duration, ms), start + MIN_MS);
          setEnd(Math.min(en, start + maxMs));
          if (video.current) video.current.currentTime = Math.max(start, en - 1500) / 1000;
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  function togglePlay() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  async function next() {
    const v = video.current;
    if (!v) return;
    setBusy(true);
    v.pause();
    const coverAt = Math.min(Math.max(cover, start), end);
    let dataUrl: string | null = null;
    try {
      await seek(v, coverAt / 1000);
      dataUrl = grab(v, 360);
    } catch {
      /* cover preview is optional */
    }
    onNext({ trimStartMs: start > 50 ? start : null, trimEndMs: end < duration - 50 ? end : null, coverMs: coverAt }, dataUrl);
  }

  const length = end - start;
  return (
    <Portal>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Edit clip" className="fixed inset-0 z-[70] flex flex-col bg-navy text-white">
        <div className="flex items-center justify-between px-3 pb-2 pt-[calc(var(--sat)+0.75rem)]">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-full px-2 py-2 text-[14px] font-semibold">
            <ChevronLeft size={20} /> Back
          </button>
          <div className="flex rounded-full bg-white/10 p-1 text-[13px] font-semibold" role="tablist">
            {(["trim", "cover"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  if (m === "cover" && video.current) {
                    video.current.pause();
                    setPlaying(false);
                    video.current.currentTime = cover / 1000;
                  }
                }}
                className={cn("rounded-full px-4 py-1.5 capitalize transition-colors", mode === m ? "bg-green text-navy" : "text-white/70")}
              >
                {m}
              </button>
            ))}
          </div>
          <button type="button" onClick={next} disabled={!duration || busy} className="btn btn-accent btn-sm">
            Next
          </button>
        </div>

        <div className="relative mx-auto min-h-0 w-full max-w-[480px] flex-1 px-3">
          <video ref={video} src={url} autoPlay muted={false} playsInline loop={false} onClick={togglePlay} className="h-full w-full rounded-2xl bg-black object-contain" />
          {mode === "trim" && (
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="absolute bottom-3 left-6 grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur">
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
          )}
        </div>

        <div className="mx-auto w-full max-w-[480px] px-4 pb-[calc(var(--sab)+1.25rem)] pt-4">
          {mode === "trim" ? (
            <>
              <div className="mb-2 flex justify-between text-[12px] tabular text-white/70">
                <span>{fmt(start)}</span>
                <span className={cn("font-semibold", length > maxMs - 100 ? "text-green" : "text-white")}>{fmt(length)} selected</span>
                <span>{fmt(end)}</span>
              </div>
              <div ref={track} className="relative h-16 select-none touch-none">
                <div className="absolute inset-0 flex overflow-hidden rounded-lg bg-white/10">
                  {Array.from({ length: FRAMES }, (_, i) =>
                    frames[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- generated thumbnails
                      <img key={i} src={frames[i]} alt="" className="h-full min-w-0 flex-1 object-cover" />
                    ) : (
                      <span key={i} className="skeleton-dark skeleton h-full flex-1 rounded-none" />
                    ),
                  )}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 rounded-l-lg bg-black/60" style={{ width: `${pct(start)}%` }} />
                <div className="pointer-events-none absolute inset-y-0 right-0 rounded-r-lg bg-black/60" style={{ width: `${100 - pct(end)}%` }} />
                <div className="pointer-events-none absolute inset-y-0 border-y-[3px] border-green" style={{ left: `${pct(start)}%`, right: `${100 - pct(end)}%` }} />
                <span className="pointer-events-none absolute inset-y-[-4px] w-0.5 rounded bg-white" style={{ left: `${pct(now)}%` }} />
                <button type="button" aria-label="Trim start" onPointerDown={drag("start")} className="absolute inset-y-0 grid w-5 -translate-x-full place-items-center rounded-l-lg bg-green text-navy" style={{ left: `${pct(start)}%` }}>
                  <span className="h-6 w-1 rounded bg-navy/60" />
                </button>
                <button type="button" aria-label="Trim end" onPointerDown={drag("end")} className="absolute inset-y-0 grid w-5 place-items-center rounded-r-lg bg-green text-navy" style={{ left: `${pct(end)}%` }}>
                  <span className="h-6 w-1 rounded bg-navy/60" />
                </button>
              </div>
              <p className="mt-3 text-center text-[12px] text-white/55">
                Drag the green handles to trim. Clips can be up to {VIDEO.maxSeconds / 60} minutes.
              </p>
            </>
          ) : (
            <>
              <label className="mb-2 block text-center text-[13px] font-semibold" htmlFor="cover-at">
                Choose your cover frame
              </label>
              <input
                id="cover-at"
                type="range"
                min={start}
                max={end}
                step={50}
                value={Math.min(Math.max(cover, start), end)}
                onChange={(e) => {
                  const ms = Number(e.target.value);
                  setCover(ms);
                  if (video.current) video.current.currentTime = ms / 1000;
                }}
                className="w-full accent-[#B7F34A]"
              />
              <p className="mt-2 text-center text-[12px] tabular text-white/55">{fmt(cover - start)} into the clip</p>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
