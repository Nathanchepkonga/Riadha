"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { VideoState } from "@/lib/video/config";

/**
 * Shown to the author on a post whose clip isn't live yet: live upload/processing status, refreshing the
 * page the moment the clip is ready.
 */
export function ProcessingNotice({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [state, setState] = useState<VideoState | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const r = await fetch(`/api/videos/${videoId}`, { cache: "no-store" }).catch(() => null);
      if (stop || !r?.ok) return;
      const s = (await r.json()) as VideoState;
      setState(s);
      if (s.status === "ready") router.refresh();
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [videoId, router]);

  const failed = state?.status === "failed";
  const text = !state
    ? "Checking your clip…"
    : state.status === "uploading"
      ? `Uploading ${Math.round((state.receivedBytes / Math.max(1, state.sizeBytes)) * 100)}% (keep Riadha open on the phone you posted from)`
      : state.status === "queued"
        ? "Waiting to be processed…"
        : state.status === "processing"
          ? "Processing: making it play smoothly on every phone…"
          : failed
            ? (state.error ?? "We couldn't process this clip.")
            : "Ready!";

  return (
    <div className="absolute inset-0 grid place-items-center bg-navy p-6 text-center text-white">
      <div>
        {failed ? <AlertTriangle size={30} className="mx-auto text-warning" /> : <Loader2 size={30} className="mx-auto animate-spin text-green" />}
        <p className="mt-3 text-[16px] font-semibold">{failed ? "Clip failed" : "Only you can see this for now"}</p>
        <p className="mt-1 text-[13px] text-white/70">{text}</p>
      </div>
    </div>
  );
}
