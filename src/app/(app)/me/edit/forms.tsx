"use client";

import { useActionState, useState, useTransition } from "react";
import { BadgeCheck, Camera, Trash2 } from "lucide-react";
import { addStat, removeStat, updateProfile } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import type { Role } from "@/db/schema";
import { COUNTIES, SPORTS } from "@/lib/constants";
import { ageFrom } from "@/lib/format";

type EditableUser = {
  displayName: string;
  handle: string;
  role: Role;
  bio: string;
  quote: string;
  tagline: string;
  sport: string;
  position: string;
  county: string;
  dateOfBirth: string;
  guardianPhone: string;
  kplClubId: string;
  avatarUrl: string | null;
  heroUrl: string | null;
};

function useObjectUrl() {
  const [url, setUrl] = useState<string | null>(null);
  return [
    url,
    (file?: File) => {
      if (url) URL.revokeObjectURL(url);
      setUrl(file ? URL.createObjectURL(file) : null);
    },
  ] as const;
}

export function ProfileForm({ user, clubs }: { user: EditableUser; clubs: { id: number; name: string }[] }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [avatar, setAvatar] = useObjectUrl();
  const [hero, setHero] = useObjectUrl();
  const [dob, setDob] = useState(user.dateOfBirth);
  const minor = (ageFrom(dob) ?? 99) < 18;
  const creator = user.role === "athlete" || user.role === "club";

  return (
    <form action={action} className="mt-6 flex flex-col gap-5">
      <section id="photos" className="grid grid-cols-[auto_1fr] items-center gap-4">
        <label className="relative cursor-pointer" aria-label="Change profile photo">
          <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setAvatar(e.target.files?.[0])} />
          <Avatar name={user.displayName} url={avatar ?? user.avatarUrl} size={80} />
          <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-green text-navy"><Camera size={14} /></span>
        </label>
        <div>
          <p className="font-semibold">Profile photo</p>
          <p className="text-sm text-muted">Square works best.</p>
        </div>
        {creator && (
          <label className="col-span-2 relative flex h-44 cursor-pointer items-end justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-offwhite">
            <input type="file" name="hero" accept="image/png,image/webp,image/jpeg" className="sr-only" onChange={(e) => setHero(e.target.files?.[0])} />
            {hero || user.heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview / user upload
              <img src={hero ?? user.heroUrl!} alt="" className="h-full w-auto object-contain object-bottom" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-center text-sm text-muted">
                <span>
                  <Camera className="mx-auto mb-1" />
                  Hero photo for your portfolio
                  <br />
                  <span className="text-xs">Transparent PNG cut-out looks best (like a poster)</span>
                </span>
              </span>
            )}
          </label>
        )}
        {creator && user.heroUrl && (
          <label className="col-span-2 -mt-2 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="removeHero" className="h-4 w-4 accent-[#DA1E28]" /> Remove current hero photo
          </label>
        )}
      </section>

      <Field label={user.role === "club" ? "Club name" : "Name"} name="displayName" defaultValue={user.displayName} required maxLength={40} />
      <Field label="Handle" name="handle" defaultValue={user.handle} required pattern="[A-Za-z0-9_]{3,20}" />
      <div>
        <label className="label" htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" defaultValue={user.bio} maxLength={300} rows={3} className="field" placeholder="400m runner training in Iten…" />
      </div>
      {creator && (
        <>
          <Field label="Hero quote (big type on your portfolio)" name="quote" defaultValue={user.quote} maxLength={120} placeholder="Every lap at altitude is a lap closer to the final." />
          <Field label="Headline" name="tagline" defaultValue={user.tagline} maxLength={60} placeholder="I'm more than a football player." />
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sport">Sport</label>
          <select id="sport" name="sport" defaultValue={user.sport} className="field">
            <option value="">—</option>
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <Field label={user.role === "club" ? "Type" : "Position / event"} name="position" defaultValue={user.position} maxLength={40} placeholder={user.role === "club" ? "Running crew" : "400m / Right winger"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="county">County</label>
          <select id="county" name="county" defaultValue={user.county} className="field">
            <option value="">—</option>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="kplClubId">KPL club</label>
          <select id="kplClubId" name="kplClubId" defaultValue={user.kplClubId} className="field">
            <option value="">None</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {user.role === "athlete" && (
        <>
          <div>
            <label className="label" htmlFor="dateOfBirth">Date of birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="field" required />
          </div>
          {minor && (
            <Field
              label="Guardian phone (required for under-18s)"
              name="guardianPhone"
              defaultValue={user.guardianPhone}
              placeholder="0712 345 678"
              required
              type="tel"
            />
          )}
        </>
      )}
      {user.role !== "athlete" && <input type="hidden" name="dateOfBirth" value={user.dateOfBirth} />}

      <FormMessage state={state} />
      <SubmitButton className="btn-primary btn-lg btn-block">Save profile</SubmitButton>
    </form>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="field" {...rest} />
    </div>
  );
}

export function StatsEditor({ stats }: { stats: { id: number; label: string; value: string; context: string | null; verifiedByClub: boolean }[] }) {
  const [state, action] = useActionState(addStat, undefined);
  const [pending, start] = useTransition();
  return (
    <section className="mt-12">
      <h2 className="h4">Your numbers</h2>
      <p className="mt-1 text-sm text-muted">PBs, season stats, records. Club-verified stats get a badge and rank higher.</p>
      <ul className="card mt-4 divide-y divide-line/70">
        {stats.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1">
              <span className="block text-[11px] uppercase tracking-wider text-muted">{s.label}</span>
              <span className="text-xl font-semibold tracking-tight">{s.value}</span>
              {s.context && <span className="ml-2 text-xs text-muted">{s.context}</span>}
            </span>
            {s.verifiedByClub && <BadgeCheck size={18} className="fill-green text-navy" aria-label="Verified by club" />}
            <button type="button" disabled={pending} onClick={() => start(() => removeStat(s.id))} aria-label={`Remove ${s.label}`} className="text-muted hover:text-danger">
              <Trash2 size={17} />
            </button>
          </li>
        ))}
        {stats.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No stats yet.</li>}
      </ul>
      <form action={action} className="mt-3 grid grid-cols-2 gap-2">
        <input name="label" required maxLength={30} placeholder="400m" className="field" aria-label="Stat name" />
        <input name="value" required maxLength={20} placeholder="53.8s" className="field" aria-label="Value" />
        <input name="context" maxLength={40} placeholder="Personal best · 2026" className="field col-span-2" aria-label="Context" />
        <div className="col-span-2"><FormMessage state={state} /></div>
        <SubmitButton pendingText="Adding…" className="btn-secondary col-span-2">Add stat</SubmitButton>
      </form>
    </section>
  );
}
