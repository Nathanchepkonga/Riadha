"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clapperboard, FileUp, Footprints, ImagePlus, Smartphone, Trophy, X } from "lucide-react";
import { createPost } from "@/actions/social";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { CameraCapture } from "@/components/video/camera";
import { VideoEditor } from "@/components/video/editor";
import { burst } from "@/lib/celebrate";
import { cn } from "@/lib/format";
import { VIDEO } from "@/lib/video/config";
import { uploads, useUploads } from "@/lib/video/uploads";

type Media =
  | { kind: "video"; file: File; durationHintMs?: number }
  | { kind: "image"; file: File; url: string };
type Draft = { body: string; statLabel: string; statValue: string; location: string };

/**
 * The post flow: pick a source (in-app camera, phone camera, gallery, photo or just a stat) → trim and
 * pick a cover → caption. The clip starts uploading the moment you leave the editor, so by the time the
 * caption is written it's often already there (TikTok's trick).
 */
export function Composer({ userHandle, statHint }: { userHandle: string; statHint: { label: string; value: string } }) {
  const router = useRouter();
  const [media, setMedia] = useState<Media | null>(null);
  const [step, setStep] = useState<"pick" | "camera" | "edit" | "details">("pick");
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ body: "", statLabel: "", statValue: "", location: "" });
  const [hasDraft, setHasDraft] = useState(false);
  const [photoState, photoAction] = useActionState(createPost, undefined);
  const jobs = useUploads();
  const job = jobs.find((j) => j.key === uploadKey);
  const draftKey = `riadha-post-draft:${userHandle}`;

  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const value = JSON.parse(saved) as Partial<Draft>;
      if (value.body || value.statLabel || value.statValue || value.location) {
        const restored: Draft = {
          body: typeof value.body === "string" ? value.body : "",
          statLabel: typeof value.statLabel === "string" ? value.statLabel : "",
          statValue: typeof value.statValue === "string" ? value.statValue : "",
          location: typeof value.location === "string" ? value.location : "",
        };
        const timer = window.setTimeout(() => {
          if (active) {
            setDraft(restored);
            setHasDraft(true);
          }
        });
        return () => {
          active = false;
          window.clearTimeout(timer);
        };
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (draft.body || draft.statLabel || draft.statValue || draft.location) localStorage.setItem(draftKey, JSON.stringify(draft));
    else localStorage.removeItem(draftKey);
  }, [draft, draftKey]);

  function clearDraft() {
    setDraft({ body: "", statLabel: "", statValue: "", location: "" });
    setHasDraft(false);
    localStorage.removeItem(draftKey);
  }

  function pickVideo(file: File, durationHintMs?: number) {
    setError(null);
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(file.name)) return setError("That isn't a video file.");
    if (file.size > VIDEO.maxBytes) return setError(`That video is over ${VIDEO.maxBytes / 1024 / 1024}MB. Trim it on your phone first.`);
    setMedia({ kind: "video", file, durationHintMs });
    setStep("edit");
  }

  function pickPhoto(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("That isn't a photo.");
    setMedia({ kind: "image", file, url: URL.createObjectURL(file) });
    setStep("details");
  }

  function reset() {
    if (uploadKey) void uploads.cancel(uploadKey);
    if (media?.kind === "image") URL.revokeObjectURL(media.url);
    setMedia(null);
    setUploadKey(null);
    setCover(null);
    setStep("pick");
  }

  function postVideo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uploadKey) return;
    const f = new FormData(e.currentTarget);
    const statLabel = String(f.get("statLabel") ?? "").trim();
    const statValue = String(f.get("statValue") ?? "").trim();
    if (!!statLabel !== !!statValue) return setError("Add both a stat name and a value, or neither.");
    uploads.post(uploadKey, { body: String(f.get("body") ?? "").trim(), statLabel, statValue, location: String(f.get("location") ?? "").trim() });
    clearDraft();
    burst(e.nativeEvent instanceof SubmitEvent ? e.nativeEvent.submitter : null, { count: 12, spread: 70 });
    router.push("/feed");
  }

  // ── Step 1: choose a source ──
  if (step === "pick" || step === "camera") {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setStep("camera")} className="pressable edge-glow relative flex items-center gap-4 overflow-hidden rounded-3xl bg-navy p-5 text-left text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-green text-navy">
            <Camera size={26} />
          </span>
          <span>
            <span className="block text-[18px] font-bold tracking-[-0.02em]">Record</span>
            <span className="text-[13px] text-white/65">Riadha camera: takes, countdown timer, up to {VIDEO.maxSeconds / 60} min</span>
          </span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/run/record" className="pressable flex flex-col gap-2 rounded-2xl bg-green p-4 text-navy">
            <Footprints size={22} />
            <span className="font-semibold">Record a run</span>
            <span className="text-[12px] text-navy/70">GPS run, walk or ride: posted with your route shape</span>
          </Link>
          <Link href="/run/upload" className="card pressable flex flex-col gap-2 p-4">
            <FileUp size={22} className="text-cobalt" />
            <span className="font-semibold">Run from a watch</span>
            <span className="text-[12px] text-muted">Garmin, Coros, Huawei… GPX, TCX or FIT</span>
          </Link>
          <label className="card pressable flex cursor-pointer flex-col gap-2 p-4">
            <Clapperboard size={22} className="text-cobalt" />
            <span className="font-semibold">Video from gallery</span>
            <span className="text-[12px] text-muted">MP4 or MOV, any length (you&apos;ll trim it)</span>
            <input type="file" accept="video/*" aria-label="Choose a video from your gallery" className="sr-only" onChange={(e) => e.target.files?.[0] && pickVideo(e.target.files[0])} />
          </label>
          <label className="card pressable flex cursor-pointer flex-col gap-2 p-4">
            <Smartphone size={22} className="text-cobalt" />
            <span className="font-semibold">Phone camera</span>
            <span className="text-[12px] text-muted">Best quality, slow-mo and stabilisation</span>
            <input type="file" accept="video/*" capture="environment" aria-label="Record a video with your phone camera" className="sr-only" onChange={(e) => e.target.files?.[0] && pickVideo(e.target.files[0])} />
          </label>
          <label className="card pressable flex cursor-pointer flex-col gap-2 p-4">
            <ImagePlus size={22} className="text-cobalt" />
            <span className="font-semibold">Photo</span>
            <span className="text-[12px] text-muted">JPG, PNG or WebP up to 8MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Choose a photo" className="sr-only" onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setStep("details")} className="card pressable flex flex-col gap-2 p-4 text-left">
            <Trophy size={22} className="text-cobalt" />
            <span className="font-semibold">Just a stat</span>
            <span className="text-[12px] text-muted">A PB, a result, a time</span>
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-danger/8 px-4 py-3 text-sm">{error}</p>}
        <p className="mt-2 text-center text-[12px] text-muted">Clips are compressed on your phone to save data, then streamed in the best quality each viewer&apos;s network can take.</p>
        {step === "camera" && (
          <CameraCapture
            onClose={() => setStep("pick")}
            onCaptured={(file, ms) => pickVideo(file, ms)}
            onPickFile={(file) => pickVideo(file)}
          />
        )}
      </div>
    );
  }

  // ── Step 2: trim + cover (full screen) ──
  if (step === "edit" && media?.kind === "video") {
    return (
      <VideoEditor
        file={media.file}
        durationHintMs={media.durationHintMs}
        onBack={reset}
        onNext={(edits, coverDataUrl) => {
          setCover(coverDataUrl);
          setUploadKey(uploads.start(media.file, edits, coverDataUrl));
          setStep("details");
        }}
      />
    );
  }

  // ── Step 3: details ──
  const isVideo = media?.kind === "video";
  const progress = job ? (job.phase === "compressing" ? `Compressing ${Math.round(job.progress * 100)}%` : job.phase === "uploading" ? `Uploading ${Math.round(job.progress * 100)}%` : job.phase === "offline" ? "Waiting for network…" : job.phase === "failed" ? (job.error ?? "Upload failed") : "Uploaded") : null;
  const fields = (
    <>
      <div>
        <label className="label" htmlFor="body">Caption</label>
        <textarea id="body" name="body" maxLength={600} rows={3} aria-describedby="caption-help" className="field" placeholder="Time trial at Kamariny this morning. New PB 🔥" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
        <p id="caption-help" className="mt-2 text-[12px] text-muted">{draft.body.length}/600 characters</p>
      </div>
      <fieldset>
        <legend className="label">Stat (the hero of your post)</legend>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <input id="stat-label" name="statLabel" maxLength={30} className="field" placeholder={statHint.label} aria-label="Stat name" value={draft.statLabel} onChange={(e) => setDraft((d) => ({ ...d, statLabel: e.target.value }))} />
          <input id="stat-value" name="statValue" maxLength={20} className="field tabular" placeholder={statHint.value} aria-label="Stat value" value={draft.statValue} onChange={(e) => setDraft((d) => ({ ...d, statValue: e.target.value }))} />
        </div>
        <p className="helper">Verified stats rank higher in the feed than likes do.</p>
      </fieldset>
      <div>
        <label className="label" htmlFor="location">Location</label>
        <input id="location" name="location" maxLength={60} className="field" placeholder="Kamariny Stadium, Iten" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      {hasDraft && (
        <div className="flex items-start gap-3 rounded-2xl border border-cobalt/30 bg-cobalt/8 px-4 py-3" role="status">
          <span className="min-w-0 flex-1 text-[13px]"><strong>Draft restored.</strong> Your caption and details were saved on this phone.</span>
          <button type="button" onClick={clearDraft} className="shrink-0 text-[12px] font-semibold text-cobalt">Discard</button>
        </div>
      )}
      {media && (
        <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <span className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl bg-navy">
            {(isVideo ? cover : media.kind === "image" ? media.url : null) && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview
              <img src={(isVideo ? cover : (media as { url: string }).url)!} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{isVideo ? "Your clip" : "Your photo"}</p>
            {isVideo && (
              <>
                <p className={cn("text-[13px]", job?.phase === "failed" ? "text-danger" : "text-muted")}>{progress}</p>
                {job && job.phase !== "failed" && (
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="Video upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.phase === "compressing" || job.phase === "uploading" ? Math.round(job.progress * 100) : 100}>
                    <span className="block h-full rounded-full bg-[linear-gradient(90deg,#8DD63A,#B7F34A)] transition-[width] duration-300" style={{ width: `${job.phase === "compressing" || job.phase === "uploading" ? Math.max(3, job.progress * 100) : 100}%` }} />
                  </span>
                )}
              </>
            )}
          </div>
          <button type="button" onClick={reset} aria-label="Remove media" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 hover:bg-gray-200">
            <X size={16} />
          </button>
        </div>
      )}

      {isVideo ? (
        <form onSubmit={postVideo} className="flex flex-col gap-5">
          {fields}
          {error && <p role="alert" className="rounded-lg bg-danger/8 px-4 py-3 text-sm">{error}</p>}
          <button type="submit" disabled={!job || job.phase === "failed"} className="btn btn-accent btn-lg btn-block">
            Post clip
          </button>
          <p className="-mt-2 text-center text-[12px] text-muted">You can leave this screen; the upload carries on and your clip goes live when it&apos;s ready.</p>
        </form>
      ) : (
        <form action={photoAction} className="flex flex-col gap-5">
          {media?.kind === "image" && <PhotoInput file={media.file} />}
          {fields}
          <FormMessage state={photoState} />
          <SubmitButton pendingText="Posting…" className="btn-accent btn-lg btn-block">{media ? "Post photo" : "Post stat"}</SubmitButton>
          {!media && (
            <button type="button" onClick={() => setStep("pick")} className="-mt-2 text-[13px] font-semibold text-cobalt">
              Add a clip or photo instead
            </button>
          )}
        </form>
      )}
    </div>
  );
}

/** Puts the chosen photo into the form as the `media` file field. */
function PhotoInput({ file }: { file: File }) {
  return (
    <input
      type="file"
      name="media"
      className="hidden"
      ref={(el) => {
        if (!el) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
      }}
    />
  );
}
