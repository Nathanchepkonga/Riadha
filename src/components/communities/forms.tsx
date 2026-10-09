"use client";

import { useActionState, useState } from "react";
import { ImagePlus } from "lucide-react";
import { createCommunity, createEvent, updateCommunity } from "@/actions/communities";
import { COMMUNITY_INTERESTS, COUNTIES } from "@/lib/constants";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { cn } from "@/lib/format";
import { CategoryIcon } from "./community-art";

type CommunityValues = { id?: number; name: string; description: string; category: string; county: string; coverUrl: string | null };

/** Create or edit a community. Category is picked from icon tiles; the cover is optional. */
export function CommunityForm({ values }: { values?: CommunityValues }) {
  const [state, action] = useActionState(values?.id ? updateCommunity.bind(null, values.id) : createCommunity, undefined);
  const [category, setCategory] = useState(values?.category ?? "");
  const [cover, setCover] = useState<string | null>(values?.coverUrl ?? null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface text-center text-[13px] text-muted hover:border-gray-400">
        <input
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setCover(f ? URL.createObjectURL(f) : (values?.coverUrl ?? null));
          }}
        />
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview / upload
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span>
            <ImagePlus className="mx-auto mb-1" />
            Cover photo (optional)
          </span>
        )}
      </label>

      <div>
        <label className="label" htmlFor="c-name">Name</label>
        <input id="c-name" name="name" required minLength={3} maxLength={60} defaultValue={values?.name} placeholder="Nairobi Morning Run" className="field" />
      </div>

      <fieldset>
        <legend className="label">Sport or interest</legend>
        <div className="grid grid-cols-3 gap-2 min-[400px]:grid-cols-4">
          {COMMUNITY_INTERESTS.map((c) => {
            return (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="category" value={c} required checked={category === c} onChange={() => setCategory(c)} className="peer sr-only" />
                <span className="pressable flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-3 text-[12px] font-semibold transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt">
                  <CategoryIcon category={c} size={20} className={cn(category === c && "text-green")} />
                  {c}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="c-county">County (optional)</label>
        <select id="c-county" name="county" defaultValue={values?.county ?? ""} className="field">
          <option value="">Anywhere in Kenya</option>
          {COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="c-desc">What&apos;s it about?</label>
        <textarea id="c-desc" name="description" required minLength={10} maxLength={600} rows={4} defaultValue={values?.description} placeholder="We run 10K every Saturday from Karura gate A at 6:30am. All paces welcome." className="field" />
      </div>

      <FormMessage state={state} />
      <SubmitButton pendingText={values?.id ? "Saving…" : "Creating…"} className="btn-primary btn-lg btn-block">
        {values?.id ? "Save changes" : "Create community"}
      </SubmitButton>
    </form>
  );
}

/** New event: datetime-local inputs are read as Nairobi time on the server. */
export function EventForm({ communityId }: { communityId: number }) {
  const [state, action] = useActionState(createEvent.bind(null, communityId), undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="e-title">Title</label>
        <input id="e-title" name="title" required minLength={3} maxLength={80} placeholder="Saturday 10K long run" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="e-loc">Where</label>
        <input id="e-loc" name="location" required maxLength={120} placeholder="Karura Forest, Gate A" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="e-start">Starts</label>
          <input id="e-start" name="startsAt" type="datetime-local" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="e-end">Ends (optional)</label>
          <input id="e-end" name="endsAt" type="datetime-local" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="e-cap">Capacity (optional)</label>
        <input id="e-cap" name="capacity" type="number" inputMode="numeric" min={2} max={100000} placeholder="No limit" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="e-desc">Details</label>
        <textarea id="e-desc" name="description" maxLength={1500} rows={4} placeholder="Pace groups, what to bring, where to park…" className="field" />
      </div>
      <p className="text-[12px] text-muted">Times are Nairobi time (EAT). You&apos;ll be marked as going.</p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…" className="btn-primary btn-lg btn-block">Create event</SubmitButton>
    </form>
  );
}
