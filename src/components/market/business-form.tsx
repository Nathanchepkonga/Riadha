"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
  const [category, setCategory] = useState(values.category);
  const [county, setCounty] = useState(values.county);
  const [description, setDescription] = useState(values.description);
  const [priceFrom, setPriceFrom] = useState(values.priceFrom);
  const [hours, setHours] = useState(values.hours);
  const [address, setAddress] = useState(values.address);
  const [contact, setContact] = useState({ phone: values.phone, whatsapp: values.whatsapp, email: values.email, website: values.website });
  const [hasDraft, setHasDraft] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const options = [...new Set([...AMENITIES, ...amenities])];
  const toggle = (list: string[], set: (v: string[]) => void, v: string, on: boolean) => set(on ? [...list, v] : list.filter((x) => x !== v));
  const draftKey = `riadha-business-draft:${values.id ?? "new"}`;
  const draft = useMemo(() => ({ name, category, county, description, priceFrom, hours, address, amenities, sports }), [name, category, county, description, priceFrom, hours, address, amenities, sports]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) {
          setHydrated(true);
          return;
        }
        const value = JSON.parse(saved) as Partial<typeof draft>;
        if (!active || !Object.values(value).some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item))) {
          setHydrated(true);
          return;
        }
        setName(typeof value.name === "string" ? value.name : "");
        setCategory(typeof value.category === "string" ? value.category : "");
        setCounty(typeof value.county === "string" ? value.county : "");
        setDescription(typeof value.description === "string" ? value.description : "");
        setPriceFrom(typeof value.priceFrom === "string" ? value.priceFrom : "");
        setHours(typeof value.hours === "string" ? value.hours : "");
        setAddress(typeof value.address === "string" ? value.address : "");
        setAmenities(Array.isArray(value.amenities) ? value.amenities.filter((item): item is string => typeof item === "string") : []);
        setSports(Array.isArray(value.sports) ? value.sports.filter((item): item is string => typeof item === "string") : []);
        setHasDraft(true);
        setHydrated(true);
      } catch {
        localStorage.removeItem(draftKey);
        setHydrated(true);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draftKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (Object.values(draft).some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item))) localStorage.setItem(draftKey, JSON.stringify(draft));
    else localStorage.removeItem(draftKey);
  }, [draft, draftKey, hydrated]);

  function clearDraft() {
    setName(values.name);
    setCategory(values.category);
    setCounty(values.county);
    setDescription(values.description);
    setPriceFrom(values.priceFrom);
    setHours(values.hours);
    setAddress(values.address);
    setAmenities(values.amenities);
    setSports(values.sports);
    setHasDraft(false);
    localStorage.removeItem(draftKey);
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {hasDraft && (
        <div className="flex items-start gap-3 rounded-2xl border border-cobalt/30 bg-cobalt/8 px-4 py-3" role="status">
          <span className="min-w-0 flex-1 text-[13px]"><strong>Draft restored.</strong> Your listing details were saved on this phone. Contact details are never stored in the draft.</span>
          <button type="button" onClick={clearDraft} className="shrink-0 text-[12px] font-semibold text-cobalt">Discard</button>
        </div>
      )}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="relative">
        <label className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface text-center text-[13px] text-muted hover:border-gray-400">
          <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" aria-label="Choose a cover photo" className="sr-only" onChange={(e) => e.target.files?.[0] && setCover(URL.createObjectURL(e.target.files[0]))} />
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview / upload
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span>
              <ImagePlus className="mx-auto mb-1" /> Cover photo: your space, pitch or shop front
            </span>
          )}
        </label>
        <label className="absolute -bottom-5 left-4 cursor-pointer" aria-label="Choose a business logo">
          <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" aria-label="Choose a business logo" className="sr-only" onChange={(e) => e.target.files?.[0] && setLogo(URL.createObjectURL(e.target.files[0]))} />
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
          <select id="b-cat" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} className="field">
            <option value="" disabled>Choose…</option>
            {BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-county">County</label>
          <select id="b-county" name="county" required value={county} onChange={(e) => setCounty(e.target.value)} className="field">
            <option value="" disabled>Choose…</option>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="b-desc">About</label>
        <textarea id="b-desc" name="description" required minLength={20} maxLength={1200} rows={4} aria-describedby="b-desc-help" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you offer, who it's for and what makes you different." className="field" />
        <p id="b-desc-help" className="mt-2 text-[12px] text-muted">{description.length}/1200 characters; minimum 20.</p>
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
          <input id="b-price" name="priceFrom" type="number" inputMode="numeric" min={0} value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder="1500" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="b-hours">Opening hours</label>
          <input id="b-hours" name="hours" maxLength={80} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Sat 5am–9pm" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="b-addr">Address or landmark</label>
        <input id="b-addr" name="address" maxLength={120} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opposite Kamariny Stadium, Iten" className="field" />
      </div>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="label col-span-2">How athletes reach you (at least one)</legend>
        <label className="sr-only" htmlFor="b-phone">Phone</label>
        <input id="b-phone" name="phone" type="tel" value={contact.phone} onChange={(e) => setContact((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone" aria-label="Phone" className="field" />
        <label className="sr-only" htmlFor="b-whatsapp">WhatsApp</label>
        <input id="b-whatsapp" name="whatsapp" type="tel" value={contact.whatsapp} onChange={(e) => setContact((v) => ({ ...v, whatsapp: e.target.value }))} placeholder="WhatsApp" aria-label="WhatsApp" className="field" />
        <label className="sr-only" htmlFor="b-email">Email</label>
        <input id="b-email" name="email" type="email" value={contact.email} onChange={(e) => setContact((v) => ({ ...v, email: e.target.value }))} placeholder="Email" aria-label="Email" className="field col-span-2" />
        <label className="sr-only" htmlFor="b-website">Website (optional)</label>
        <input id="b-website" name="website" value={contact.website} onChange={(e) => setContact((v) => ({ ...v, website: e.target.value }))} placeholder="Website (optional)" aria-label="Website" className="field col-span-2" />
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
