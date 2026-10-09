"use client";

import { useActionState, useState } from "react";
import { Camera, ImagePlus, Plus, X } from "lucide-react";
import { saveBusiness } from "@/actions/market";
import { AMENITIES, BUSINESS_CATEGORIES, COUNTIES, SPORTS } from "@/lib/constants";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { BusinessLogo } from "./ad-card";

export type BusinessValues = {
  id?: number;
  name: string;
  category: string;
  description: string;
  county: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  hours: string;
  priceFrom: string;
  amenities: string[];
  sports: string[];
  logoUrl: string | null;
  coverUrl: string | null;
};

const EMPTY: BusinessValues = { name: "", category: "", description: "", county: "", address: "", phone: "", whatsapp: "", email: "", website: "", hours: "", priceFrom: "", amenities: [], sports: [], logoUrl: null, coverUrl: null };

function Chip({ name, value, checked, onChange }: { name: string; value: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt">{value}</span>
    </label>
  );
}

/** Create or edit a marketplace listing. */
export function BusinessForm({ values = EMPTY }: { values?: BusinessValues }) {
  const [state, action] = useActionState(saveBusiness, undefined);
  const [amenities, setAmenities] = useState<string[]>(values.amenities);
  const [sports, setSports] = useState<string[]>(values.sports);
  const [custom, setCustom] = useState("");
  const [logo, setLogo] = useState(values.logoUrl);
  const [cover, setCover] = useState(values.coverUrl);
  const [name, setName] = useState(values.name);
  const options = [...new Set([...AMENITIES, ...amenities])];
  const toggle = (list: string[], set: (v: string[]) => void, v: string, on: boolean) => set(on ? [...list, v] : list.filter((x) => x !== v));

  return (
    <form action={action} className="flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="relative">
        <label className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface text-center text-[13px] text-muted hover:border-gray-400">
          <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && setCover(URL.createObjectURL(e.target.files[0]))} />
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview / upload
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span>
              <ImagePlus className="mx-auto mb-1" /> Cover photo: your space, pitch or shop front
            </span>
          )}
        </label>
        <label className="absolute -bottom-5 left-4 cursor-pointer" aria-label="Logo">
          <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && setLogo(URL.createObjectURL(e.target.files[0]))} />
          <BusinessLogo name={name || "Your business"} url={logo} size={64} className="ring-4 ring-offwhite" />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-navy text-white"><Camera size={12} /></span>
        </label>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="b-name">Business name</label>
        <input id="b-name" name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Iten Altitude Gym" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="b-cat">Category</label>
          <select id="b-cat" name="category" required defaultValue={values.category} className="field">
            <option value="" disabled>Choose…</option>
            {BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-county">County</label>
          <select id="b-county" name="county" required defaultValue={values.county} className="field">
            <option value="" disabled>Choose…</option>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="b-desc">About</label>
        <textarea id="b-desc" name="description" required minLength={20} maxLength={1200} rows={4} defaultValue={values.description} placeholder="What you offer, who it's for and what makes you different." className="field" />
      </div>

      <fieldset>
        <legend className="label">Amenities</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.map((a) => <Chip key={a} name="amenities" value={a} checked={amenities.includes(a)} onChange={(on) => toggle(amenities, setAmenities, a, on)} />)}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder="Add your own" aria-label="Add an amenity" className="field field-sm flex-1" />
          <button
            type="button"
            onClick={() => {
              const v = custom.trim();
              if (v && !amenities.includes(v)) setAmenities([...amenities, v]);
              setCustom("");
            }}
            className="btn btn-secondary btn-sm h-9"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Sports you serve</legend>
        <div className="flex flex-wrap gap-1.5">
          {SPORTS.map((s) => <Chip key={s} name="sports" value={s} checked={sports.includes(s)} onChange={(on) => toggle(sports, setSports, s, on)} />)}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="b-price">Prices from (KSh)</label>
          <input id="b-price" name="priceFrom" type="number" inputMode="numeric" min={0} defaultValue={values.priceFrom} placeholder="1500" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="b-hours">Opening hours</label>
          <input id="b-hours" name="hours" maxLength={80} defaultValue={values.hours} placeholder="Mon–Sat 5am–9pm" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="b-addr">Address or landmark</label>
        <input id="b-addr" name="address" maxLength={120} defaultValue={values.address} placeholder="Opposite Kamariny Stadium, Iten" className="field" />
      </div>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="label col-span-2">How athletes reach you (at least one)</legend>
        <input name="phone" type="tel" defaultValue={values.phone} placeholder="Phone" aria-label="Phone" className="field" />
        <input name="whatsapp" type="tel" defaultValue={values.whatsapp} placeholder="WhatsApp" aria-label="WhatsApp" className="field" />
        <input name="email" type="email" defaultValue={values.email} placeholder="Email" aria-label="Email" className="field col-span-2" />
        <input name="website" defaultValue={values.website} placeholder="Website (optional)" aria-label="Website" className="field col-span-2" />
      </fieldset>

      {amenities.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-[12px] text-muted">
          Showing:{" "}
          {amenities.map((a) => (
            <button key={a} type="button" onClick={() => setAmenities(amenities.filter((x) => x !== a))} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 hover:bg-gray-200">
              {a} <X size={10} />
            </button>
          ))}
        </p>
      )}

      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…" className="btn-primary btn-lg btn-block">{values.id ? "Save listing" : "Publish listing"}</SubmitButton>
    </form>
  );
}
