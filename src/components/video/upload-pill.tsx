"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, CloudOff, ListVideo, RotateCcw, X } from "lucide-react";
import { Sheet } from "@/components/ui/overlay";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/format";
import { uploads, useUploads, type UploadJob } from "@/lib/video/uploads";

const LABEL: Record<UploadJob["phase"], string> = {
  compressing: "Compressing",
  uploading: "Uploading",
  offline: "Waiting for network",
  finishing: "Finishing upload",
  processing: "Processing",
  ready: "Posted",
  failed: "Upload failed",
  canceled: "Canceled",
};

/**
 * TikTok-style progress pill above the dock: shows the clip being uploaded or processed while the athlete
 * keeps using the app, celebrates when it's live, and offers retry when it fails.
 */
export function UploadPill() {
  const jobs = useUploads();
  const job = jobs.at(-1);
  const pathname = usePathname();
  const [showAll, setShowAll] = useState(false);
  const celebrated = useRef(new Set<string>());
  const pill = useRef<HTMLDivElement>(null);
  const live = job?.phase === "ready" && job.posted && !!job.postId;

  useEffect(() => {
    if (job && live && !celebrated.current.has(job.key)) {
      celebrated.current.add(job.key);
      celebrate(pill.current);
      const t = setTimeout(() => uploads.dismiss(job.key), 8000);
      return () => clearTimeout(t);
    }
  }, [job, live]);

  // The post screen shows its own progress.
  if (!job || pathname.startsWith("/post")) return null;
  const waitingForPost = job.phase === "ready" && !job.posted;
  const pct = job.phase === "processing" ? null : Math.round(job.progress * 100);
  const failed = job.phase === "failed";
  const otherJobs = jobs.length - 1;
  return (
    <>
      <div
        ref={pill}
        role="status"
        aria-live="polite"
        className="animate-fade-slide-up fixed inset-x-0 bottom-[calc(var(--tabbar-h)+0.5rem)] z-[45] mx-auto flex w-[calc(100%-1.5rem)] max-w-[456px] items-center gap-3 overflow-hidden rounded-2xl bg-navy/95 p-2 pr-3 text-white shadow-[0_14px_40px_-14px_rgba(8,16,24,.7)] ring-1 ring-white/10 backdrop-blur-xl"
      >
        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-navy-2">
          {job.coverDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local cover frame
            <img src={job.coverDataUrl} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            {job.phase === "ready" && <Check size={14} className="text-green" />}
            {job.phase === "offline" && <CloudOff size={14} className="text-warning" />}
            {waitingForPost ? "Clip ready" : LABEL[job.phase]}
            {pct !== null && !failed && job.phase !== "ready" && <span className="tabular text-white/60">{pct}%</span>}
          </p>
          <p className="truncate text-[11px] text-white/55">
            {failed ? job.error : waitingForPost ? "Add a caption and post it." : job.phase === "processing" ? "Making it play smoothly on every phone…" : job.phase === "ready" ? "Your clip is live." : job.phase === "offline" ? "We'll carry on when you're back online." : "You can keep using Riadha."}
          </p>
          {!failed && job.phase !== "ready" && (
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={cn("block h-full rounded-full bg-[linear-gradient(90deg,#8DD63A,#B7F34A)] transition-[width] duration-300", job.phase === "processing" && "animate-pulse")}
                style={{ width: `${job.phase === "processing" ? 100 : Math.max(4, pct ?? 0)}%` }}
              />
            </span>
          )}
        </div>
        {live ? (
          <Link href={`/p/${job.postId}`} onClick={() => uploads.dismiss(job.key)} className="btn btn-accent btn-sm shrink-0">
            View
          </Link>
        ) : waitingForPost ? (
          <Link href="/post/new" className="btn btn-accent btn-sm shrink-0">
            Post
          </Link>
        ) : failed ? (
          <button type="button" onClick={() => uploads.retry(job.key)} aria-label="Retry upload" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <RotateCcw size={16} />
          </button>
        ) : null}
        {jobs.length > 1 && (
          <button type="button" onClick={() => setShowAll(true)} aria-label={`View all ${jobs.length} uploads`} className="grid h-9 min-w-9 shrink-0 place-items-center rounded-full bg-white/10 px-2 text-[11px] font-semibold text-white/80 hover:bg-white/20">
            <ListVideo size={15} />
            <span className="sr-only">{otherJobs} more</span>
          </button>
        )}
        {!live && (
          <button
            type="button"
            onClick={() => (failed ? uploads.dismiss(job.key) : window.confirm(waitingForPost ? "Discard this clip?" : "Cancel this upload?") && uploads.cancel(job.key))}
            aria-label={failed ? "Dismiss" : "Cancel upload"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {showAll && <UploadSheet jobs={jobs} onClose={() => setShowAll(false)} />}
    </>
  );
}

function UploadSheet({ jobs, onClose }: { jobs: UploadJob[]; onClose: () => void }) {
  return (
    <Sheet title="Uploads" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Uploads keep running while you browse Riadha. You can retry failed clips or post one when it is ready.</p>
        {jobs.map((job) => {
          const waitingForPost = job.phase === "ready" && !job.posted;
          const live = job.phase === "ready" && job.posted && !!job.postId;
          const failed = job.phase === "failed";
          const pct = job.phase === "processing" ? null : Math.round(job.progress * 100);
          return (
            <div key={job.key} className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3">
              <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-navy">
                {job.coverDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- local cover frame
                  <img src={job.coverDataUrl} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {job.phase === "ready" && <Check size={14} className="text-green-700" />}
                  {job.phase === "offline" && <CloudOff size={14} className="text-warning" />}
                  {waitingForPost ? "Clip ready" : LABEL[job.phase]}
                  {pct !== null && !failed && job.phase !== "ready" && <span className="tabular text-muted">{pct}%</span>}
                </p>
                <p className="truncate text-xs text-muted">{failed ? job.error : waitingForPost ? "Add a caption and post it." : job.phase === "processing" ? "Making it play smoothly…" : job.phase === "ready" ? "Your clip is live." : job.phase === "offline" ? "Waiting for your connection." : "You can keep using Riadha."}</p>
                {!failed && job.phase !== "ready" && (
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-gray-200">
                    <span className={cn("block h-full rounded-full bg-green transition-[width] duration-300", job.phase === "processing" && "animate-pulse")} style={{ width: `${job.phase === "processing" ? 100 : Math.max(4, pct ?? 0)}%` }} />
                  </span>
                )}
              </div>
              {live ? (
                <Link href={`/p/${job.postId}`} onClick={() => uploads.dismiss(job.key)} className="btn btn-primary btn-sm shrink-0">View</Link>
              ) : waitingForPost ? (
                <Link href="/post/new" onClick={onClose} className="btn btn-primary btn-sm shrink-0">Post</Link>
              ) : failed ? (
                <button type="button" onClick={() => void uploads.retry(job.key)} aria-label="Retry upload" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm hover:bg-gray-200">
                  <RotateCcw size={16} />
                </button>
              ) : null}
              {!live && (
                <button type="button" onClick={() => (failed ? uploads.dismiss(job.key) : window.confirm(waitingForPost ? "Discard this clip?" : "Cancel this upload?") && uploads.cancel(job.key))} aria-label={failed ? "Dismiss" : "Cancel upload"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-gray-200 hover:text-ink">
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
