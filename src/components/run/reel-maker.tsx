"use client";

import { useRef, useState } from "react";
import { Clapperboard, ImagePlus, Loader2, X } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";
import { canMakeReels, renderReel, type ReelInput } from "@/lib/running/reel";
import { uploads } from "@/lib/video/uploads";

type Phase = "pick" | "rendering" | "sent" | "unsupported" | "failed";

/**
 * Turns a run (or a medal) into a vertical reel: the route draws itself, the numbers count up, the
 * athlete's own clips play in between. Rendered on the phone, then uploaded like any clip, and attached to
 * the run's post so it plays in the feed and in Watch.
 */
export function ReelMaker({ postId, input, label = "Make a Run Reel", className }: { postId: number; input: Omit<ReelInput, "clips">; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [clips, setClips] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  async function begin() {
    setOpen(true);
    setError(null);
    setPhase((await canMakeReels()) ? "pick" : "unsupported");
  }

  async function make() {
    setPhase("rendering");
    setProgress(0);
    ctrl.current = new AbortController();
    try {
      const out = await renderReel({ ...input, clips }, { onProgress: setProgress, signal: ctrl.current.signal });
      const key = uploads.start(out.file, { trimStartMs: null, trimEndMs: null, coverMs: out.coverMs }, out.coverDataUrl);
      uploads.post(key, { body: "", attachTo: postId });
      haptic(25);
      setPhase("sent");
    } catch (e) {
      if (ctrl.current?.signal.aborted) return setPhase("pick");
      setError((e as Error).message || "Something went wrong making the reel.");
      setPhase("failed");
    }
  }

  function close() {
    ctrl.current?.abort();
    setOpen(false);
    setClips([]);
    setPhase("pick");
  }

  return (
    <>
      <button type="button" onClick={begin} className={cn("btn btn-accent", className)}>
        <Clapperboard size={16} /> {label}
      </button>
      {open && (
        <Sheet title={input.kind === "medal" ? "Medal reel" : "Run Reel"} onClose={close}>
          {phase === "pick" && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] text-muted">
                {input.kind === "medal"
                  ? "A short video of your medal: it drops in with confetti, then your time and the date. Add up to 3 clips or photos from your runs to play before the finish."
                  : "A 10–20 second video of your run: the route draws itself and your numbers count up. Add up to 3 clips or photos from it to play in between."}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {clips.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-navy">
                    <Thumb file={f} />
                    <button type="button" aria-label="Remove" onClick={() => setClips((c) => c.filter((_, k) => k !== i))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-navy/70 text-white">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {clips.length < 3 && (
                  <label className="grid aspect-[9/16] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-[12px] font-semibold text-muted hover:border-gray-400">
                    <span className="flex flex-col items-center gap-1">
                      <ImagePlus size={22} /> Add clip or photo
                    </span>
                    <input type="file" accept="video/*,image/*" multiple className="sr-only" onChange={(e) => setClips((c) => [...c, ...[...(e.target.files ?? [])]].slice(0, 3))} />
                  </label>
                )}
              </div>
              <button type="button" onClick={make} className="btn btn-primary btn-lg btn-block">
                <Clapperboard size={18} /> Make my reel
              </button>
              <p className="text-[12px] text-muted">Made on your phone, so it works on slow data.{input.kind === "run" ? " The map never appears: only the shape, with the start and finish cut off." : ""}</p>
            </div>
          )}
          {phase === "rendering" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Loader2 size={30} className="animate-spin text-cobalt" />
              <p className="text-[18px] font-semibold">Making your reel… {Math.round(progress * 100)}%</p>
              <span className="block h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <span className="block h-full -skew-x-[37.57deg] bg-green transition-[width]" style={{ width: `${progress * 100}%` }} />
              </span>
              <button type="button" onClick={() => ctrl.current?.abort()} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          )}
          {phase === "sent" && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-[18px] font-semibold">Your reel is uploading</p>
              <p className="text-[14px] text-muted">Keep using Riadha: the pill at the bottom shows progress. Once it&apos;s ready it plays on your {input.kind === "medal" ? "medal" : "run"} in the feed and in Watch.</p>
              <button type="button" onClick={close} className="btn btn-primary btn-block">Done</button>
            </div>
          )}
          {phase === "unsupported" && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-[16px] font-semibold">This browser can&apos;t make videos</p>
              <p className="text-[14px] text-muted">Run Reels need video encoding in the browser: Chrome on Android, or Safari on iOS 17 and newer. Your run card is still shared in the feed.</p>
              <button type="button" onClick={close} className="btn btn-secondary btn-block">OK</button>
            </div>
          )}
          {phase === "failed" && (
            <div className="flex flex-col gap-3 py-2">
              <p role="alert" className="rounded-lg bg-danger/8 px-4 py-3 text-sm">{error}</p>
              <button type="button" onClick={() => setPhase("pick")} className="btn btn-primary btn-block">Try again</button>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

function Thumb({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  return file.type.startsWith("image/") ? (
    // eslint-disable-next-line @next/next/no-img-element -- local preview
    <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <video src={url} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
  );
}
