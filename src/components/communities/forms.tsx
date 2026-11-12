"use client";

import { useActionState, useEffect, useState } from "react";
import { Footprints, ImagePlus, LocateFixed } from "lucide-react";
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
export function EventForm({ communityId, running }: { communityId: number; running?: boolean }) {
  const [state, action] = useActionState(createEvent.bind(null, communityId), undefined);
  const [groupRun, setGroupRun] = useState(!!running);
  const [draft, setDraft] = useState({ title: "", location: "", startsAt: "", endsAt: "", capacity: "", description: "" });
  const [hasDraft, setHasDraft] = useState(false);
  const [spot, setSpot] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [spotError, setSpotError] = useState<string | null>(null);
  const draftKey = `riadha-event-draft:${communityId}`;

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) return;
        const value = JSON.parse(saved) as Partial<typeof draft>;
        if (active && Object.values(value).some(Boolean)) {
          setDraft({
            title: typeof value.title === "string" ? value.title : "",
            location: typeof value.location === "string" ? value.location : "",
            startsAt: typeof value.startsAt === "string" ? value.startsAt : "",
            endsAt: typeof value.endsAt === "string" ? value.endsAt : "",
            capacity: typeof value.capacity === "string" ? value.capacity : "",
            description: typeof value.description === "string" ? value.description : "",
          });
          setHasDraft(true);
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draftKey]);

  useEffect(() => {
    if (Object.values(draft).some(Boolean)) localStorage.setItem(draftKey, JSON.stringify(draft));
    else localStorage.removeItem(draftKey);
  }, [draft, draftKey]);

  function clearDraft() {
    setDraft({ title: "", location: "", startsAt: "", endsAt: "", capacity: "", description: "" });
    setHasDraft(false);
    localStorage.removeItem(draftKey);
  }
  const pin = () => {
    setSpotError(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => setSpot({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => setSpotError("Allow location to pin the meeting point, or skip it: RSVPs still match."),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  };
  return (
    <form action={action} className="flex flex-col gap-4">
      {hasDraft && (
        <div className="flex items-start gap-3 rounded-2xl border border-cobalt/30 bg-cobalt/8 px-4 py-3" role="status">
          <span className="min-w-0 flex-1 text-[13px]"><strong>Draft restored.</strong> Your event details were saved on this phone.</span>
          <button type="button" onClick={clearDraft} className="shrink-0 text-[12px] font-semibold text-cobalt">Discard</button>
        </div>
      )}
      <div>
        <label className="label" htmlFor="e-title">Title</label>
        <input id="e-title" name="title" required minLength={3} maxLength={80} placeholder="Saturday 10K long run" className="field" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
      </div>
      <div>
        <label className="label" htmlFor="e-loc">Where</label>
        <input id="e-loc" name="location" required maxLength={120} placeholder="Karura Forest, Gate A" className="field" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="e-start">Starts</label>
          <input id="e-start" name="startsAt" type="datetime-local" required className="field" value={draft.startsAt} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="e-end">Ends (optional)</label>
          <input id="e-end" name="endsAt" type="datetime-local" className="field" value={draft.endsAt} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="e-cap">Capacity (optional)</label>
        <input id="e-cap" name="capacity" type="number" inputMode="numeric" min={2} max={100000} placeholder="No limit" className="field" value={draft.capacity} onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))} />
      </div>
      <div className="rounded-2xl border border-line p-3">
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" name="isGroupRun" checked={groupRun} onChange={(e) => setGroupRun(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#081018]" />
          <span>
            <span className="flex items-center gap-1.5 font-semibold"><Footprints size={15} /> Group run</span>
            <span className="text-[12px] text-muted">Members&apos; runs from around the start time join the group results, and Riadha posts a recap afterwards.</span>
          </span>
        </label>
        {groupRun && (
          <div className="mt-3 flex flex-col gap-2 pl-7">
            <button type="button" onClick={pin} className="btn btn-secondary btn-sm self-start">
              <LocateFixed size={14} /> {spot ? "Meeting point pinned" : "Pin the meeting point (stand there)"}
            </button>
            {spot && <p className="text-[12px] text-muted">Pinned to within {Math.round(spot.acc)} m. Runs starting within 1.5 km count; only the club sees this point.</p>}
            {!spot && !spotError && <p className="text-[12px] text-muted">Optional. Without it, only members who RSVP&apos;d are matched.</p>}
            {spotError && <p className="text-[12px] text-danger">{spotError}</p>}
            <input type="hidden" name="lat" value={spot?.lat ?? ""} />
            <input type="hidden" name="lng" value={spot?.lng ?? ""} />
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="e-desc">Details</label>
        <textarea id="e-desc" name="description" maxLength={1500} rows={4} placeholder="Pace groups, what to bring, where to park…" className="field" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      </div>
      <p className="text-[12px] text-muted">Times are Nairobi time (EAT). You&apos;ll be marked as going.</p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…" className="btn-primary btn-lg btn-block">Create event</SubmitButton>
    </form>
  );
}
