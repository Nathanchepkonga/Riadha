"use client";

import { useActionState, useState } from "react";
import { ArrowUpRight, BadgeCheck, ImagePlus, Target } from "lucide-react";
import { createCampaign } from "@/actions/market";
import { COUNTIES, SPORTS, categoryLabel } from "@/lib/constants";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { BusinessLogo } from "./ad-card";

type Biz = { id: number; name: string; category: string; county: string; logoUrl: string | null; coverUrl: string | null; verified: boolean };

const ROLES = [
  { value: "athlete", label: "Athletes" },
  { value: "fan", label: "Fans" },
  { value: "club", label: "Clubs" },
  { value: "scout", label: "Scouts" },
];

function Pill({ name, value, label, checked, onChange }: { name: string; value: string; label?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt">{label ?? value}</span>
    </label>
  );
}

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

/** Build a targeted ad with a live preview of how it looks in the feed. */
export function CampaignForm({ businesses, initialBusinessId }: { businesses: Biz[]; initialBusinessId?: number }) {
  const [state, action] = useActionState(createCampaign, undefined);
  const [bizId, setBizId] = useState(initialBusinessId ?? businesses[0]?.id);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("Learn more");
  const [image, setImage] = useState<string | null>(null);
  const [sports, setSports] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const biz = businesses.find((b) => b.id === bizId) ?? businesses[0];
  const flip = (list: string[], set: (v: string[]) => void, v: string, on: boolean) => set(on ? [...list, v] : list.filter((x) => x !== v));
  const audience = [roles.length ? roles.map((r) => ROLES.find((x) => x.value === r)!.label).join(", ") : "Everyone", sports.length ? `into ${sports.join(", ")}` : null, counties.length ? `in ${counties.length > 3 ? `${counties.length} counties` : counties.join(", ")}` : "across Kenya"].filter(Boolean).join(" ");

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Live preview */}
      <div className="z-10 md:sticky md:top-[calc(4.5rem+var(--sat))]">
        <p className="kicker mb-2">Preview</p>
        <div className="edge-glow overflow-hidden rounded-3xl bg-navy text-white shadow-[0_20px_40px_-24px_rgba(8,16,24,.6)]">
          <div className="relative aspect-[16/7] bg-navy-2">
            {image || biz?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview / upload
              <img src={image ?? biz!.coverUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="bg-speed-tile absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full bg-navy/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur">Sponsored</span>
          </div>
          <div className="relative -mt-8 p-4 pt-0">
            {biz && (
              <div className="flex items-center gap-2">
                <BusinessLogo name={biz.name} url={biz.logoUrl} size={32} />
                <p className="flex items-center gap-1 text-[13px] font-semibold">
                  {biz.name} {biz.verified && <BadgeCheck size={13} className="text-green" />}
                  <span className="font-normal text-white/50">· {categoryLabel(biz.category)}</span>
                </p>
              </div>
            )}
            <p className="mt-2 text-[18px] font-bold leading-tight tracking-[-0.02em]">{headline || "Your headline"}</p>
            <p className="mt-1 line-clamp-2 text-[13px] text-white/70">{body || "One line about the offer."}</p>
            <span className="btn btn-accent btn-sm mt-3">
              {cta || "Learn more"} <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
          <Target size={13} /> Shown to {audience}.
        </p>
      </div>

      {businesses.length > 1 ? (
        <div>
          <label className="label" htmlFor="a-biz">Business</label>
          <select id="a-biz" name="businessId" value={bizId} onChange={(e) => setBizId(Number(e.target.value))} className="field">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="businessId" value={bizId} />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="h5">The ad</h2>
        <div>
          <label className="label" htmlFor="a-head">Headline</label>
          <input id="a-head" name="headline" required minLength={3} maxLength={60} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="First week of altitude training free" className="field" />
          <p className="helper text-right tabular">{headline.length}/60</p>
        </div>
        <div>
          <label className="label" htmlFor="a-body">Text</label>
          <textarea id="a-body" name="body" required minLength={10} maxLength={160} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Track access, coaching and recovery for serious runners. Book a trial session." className="field min-h-20" />
          <p className="helper text-right tabular">{body.length}/160</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-cta">Button</label>
            <input id="a-cta" name="ctaLabel" required maxLength={20} value={cta} onChange={(e) => setCta(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="a-url">Link (optional)</label>
            <input id="a-url" name="ctaUrl" maxLength={300} placeholder="Your Riadha page" className="field" />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-[13px] text-muted hover:border-gray-400">
          <ImagePlus size={18} />
          {image ? "Image chosen. Tap to change." : "Image (optional): uses your cover photo if empty"}
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && setImage(URL.createObjectURL(e.target.files[0]))} />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="h5">Who sees it</h2>
        <fieldset>
          <legend className="label">People</legend>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => <Pill key={r.value} name="targetRoles" value={r.value} label={r.label} checked={roles.includes(r.value)} onChange={(on) => flip(roles, setRoles, r.value, on)} />)}
          </div>
          <p className="helper">None selected = everyone.</p>
        </fieldset>
        <fieldset>
          <legend className="label">Sports</legend>
          <div className="flex flex-wrap gap-1.5">
            {SPORTS.map((s) => <Pill key={s} name="targetSports" value={s} checked={sports.includes(s)} onChange={(on) => flip(sports, setSports, s, on)} />)}
          </div>
        </fieldset>
        <details className="card overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold">Counties {counties.length ? `(${counties.length})` : "(all of Kenya)"}</summary>
          <div className="flex max-h-60 flex-wrap gap-1.5 overflow-y-auto border-t border-line p-3">
            {COUNTIES.map((c) => <Pill key={c} name="targetCounties" value={c} checked={counties.includes(c)} onChange={(on) => flip(counties, setCounties, c, on)} />)}
          </div>
        </details>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-min">Min age</label>
            <input id="a-min" name="minAge" type="number" inputMode="numeric" min={13} max={99} placeholder="Any" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="a-max">Max age</label>
            <input id="a-max" name="maxAge" type="number" inputMode="numeric" min={13} max={99} placeholder="Any" className="field" />
          </div>
        </div>
        <p className="text-[12px] text-muted">Under-18s only see ads from businesses the Riadha team has verified.</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <h2 className="h5 col-span-2">When</h2>
        <div>
          <label className="label" htmlFor="a-start">Start</label>
          <input id="a-start" name="startsAt" type="date" required defaultValue={today()} min={today()} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="a-end">End (optional)</label>
          <input id="a-end" name="endsAt" type="date" min={today()} className="field" />
        </div>
      </section>

      <p className="rounded-xl bg-gray-100 px-4 py-3 text-[13px] text-muted">Ads are free during the beta. Every ad is reviewed by the Riadha team before it goes live, usually within a day.</p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Submitting…" className="btn-primary btn-lg btn-block">Submit for review</SubmitButton>
    </form>
  );
}
