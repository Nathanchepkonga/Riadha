"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "@/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { Tick } from "@/components/ui/tick";
import type { Role } from "@/db/schema";
import { COUNTIES, SPORTS } from "@/lib/constants";
import { cn } from "@/lib/format";

const ROLES: { value: Role; title: string; blurb: string }[] = [
  { value: "fan", title: "Fan", blurb: "Play fantasy, follow athletes, join leagues." },
  { value: "athlete", title: "Athlete", blurb: "Post highlights and stats. Get scouted." },
  { value: "club", title: "Club / crew", blurb: "Team, academy or running crew page." },
  { value: "scout", title: "Scout", blurb: "Find and follow talent." },
];

export function OnboardingForm({ clubs, defaultName, next }: { clubs: { id: number; name: string }[]; defaultName: string; next?: string }) {
  const [state, action] = useActionState(completeOnboarding, undefined);
  const [role, setRole] = useState<Role>("fan");

  return (
    <form action={action} className="flex flex-col gap-6">
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset>
        <legend className="label">I&apos;m joining as</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                "relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors",
                role === r.value ? "border-navy bg-navy text-white" : "border-line bg-surface hover:border-gray-400",
              )}
            >
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
              <span className="flex items-center gap-1.5 text-[16px] font-bold">
                {r.title} <Tick role={r.value} verified size={14} />
              </span>
              <span className={cn("text-[13px] leading-snug", role === r.value ? "text-white/70" : "text-muted")}>{r.blurb}</span>
            </label>
          ))}
        </div>
        {role !== "fan" && (
          <p className="mt-3 text-[13px] text-muted">
            You can request your {role === "athlete" ? "blue" : role === "club" ? "green" : "grey"} tick from your profile after sign-up.
          </p>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="displayName">{role === "club" ? "Club name" : "Your name"}</label>
        <input id="displayName" name="displayName" required maxLength={40} defaultValue={defaultName === "New member" ? "" : defaultName} className="field" placeholder={role === "club" ? "Karura Dawn Runners" : "Faith Chebet"} />
      </div>
      <div>
        <label className="label" htmlFor="handle">Handle</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
          <input id="handle" name="handle" required pattern="[A-Za-z0-9_]{3,20}" className="field pl-8" placeholder="faithchebet" autoCapitalize="none" />
        </div>
      </div>

      {(role === "athlete" || role === "club") && (
        <div>
          <label className="label" htmlFor="sport">Sport</label>
          <select id="sport" name="sport" className="field" defaultValue="Football">
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}
      {role === "athlete" && (
        <div>
          <label className="label" htmlFor="dateOfBirth">Date of birth</label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" required className="field" />
          <p className="mt-2 text-[13px] text-muted">Under 18? Scouts can see your public stats, but contact requests go to your guardian and club.</p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="county">County</label>
        <select id="county" name="county" className="field" defaultValue="Nairobi">
          {COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="kplClubId">{role === "athlete" ? "KPL club (if you play in the league)" : "Your KPL club"}</label>
        <select id="kplClubId" name="kplClubId" className="field" defaultValue="">
          <option value="">{role === "athlete" ? "None" : "Pick a club"}</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <FormMessage state={state} />
      <SubmitButton pendingText="Setting up…" className="btn-accent btn-lg btn-block">Let&apos;s go</SubmitButton>
    </form>
  );
}
