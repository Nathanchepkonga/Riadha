"use client";

import { useActionState, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createPost } from "@/actions/social";
import { FormMessage, SubmitButton } from "@/components/ui/forms";

export function Composer({ statHint }: { statHint: { label: string; value: string } }) {
  const [state, action] = useActionState(createPost, undefined);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="relative block aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-gray-400 bg-surface transition-colors hover:border-cobalt">
        <input
          type="file"
          name="media"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (preview) URL.revokeObjectURL(preview.url);
            setPreview(file ? { url: URL.createObjectURL(file), video: file.type.startsWith("video/") } : null);
          }}
        />
        {preview ? (
          <>
            {preview.video ? (
              <video src={preview.url} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay loop />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local preview blob
              <img src={preview.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-navy/70 text-white" aria-hidden>
              <X size={18} />
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
            <ImagePlus size={40} strokeWidth={1.5} />
            <span className="h5 text-ink">Add a clip or photo</span>
            <span className="text-sm">Optional · video up to 60MB · photo up to 8MB</span>
          </span>
        )}
      </label>

      <div>
        <label className="label" htmlFor="body">Caption</label>
        <textarea id="body" name="body" maxLength={600} rows={3} className="field" placeholder="Time trial at Kamariny this morning. New PB 🔥" />
      </div>

      <fieldset>
        <legend className="label">Stat (the hero of your post)</legend>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <input name="statLabel" maxLength={30} className="field" placeholder={statHint.label} aria-label="Stat name" />
          <input name="statValue" maxLength={20} className="field tabular" placeholder={statHint.value} aria-label="Stat value" />
        </div>
        <p className="helper">Verified stats rank higher in the feed than likes do.</p>
      </fieldset>

      <div>
        <label className="label" htmlFor="location">Location</label>
        <input id="location" name="location" maxLength={60} className="field" placeholder="Kamariny Stadium, Iten" />
      </div>

      <FormMessage state={state} />
      <SubmitButton pendingText="Posting…" className="btn-accent btn-lg btn-block">Post highlight</SubmitButton>
    </form>
  );
}
