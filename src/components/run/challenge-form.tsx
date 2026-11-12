"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/components/ui/forms";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { cn } from "@/lib/format";
import { CHALLENGE_ACCENTS } from "@/lib/running/constants";
import { Medal } from "./medal";

const PRESETS = { single: [5, 10, 21.1, 42.2], total: [50, 100, 200] } as const;

/** Create (admins) or propose (business owners) a challenge. */
export function ChallengeForm({ action, sponsors, submitLabel = "Publish challenge" }: { action: (prev: FormState, form: FormData) => Promise<FormState>; sponsors?: { id: number; name: string }[]; submitLabel?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  const [kind, setKind] = useState<"single" | "total">("single");
  const [goal, setGoal] = useState("5");
  const [accent, setAccent] = useState<string>("green");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Medal goalM={Number(goal) * 1000 || 1000} accent={accent} size={64} />
        <label className="flex-1">
          <span className="label">Title</span>
          <input name="title" required minLength={4} maxLength={60} placeholder="November 10K Challenge" className="field" />
        </label>
      </div>
      <label>
        <span className="label">Tagline (optional)</span>
        <input name="tagline" maxLength={90} placeholder="One run, ten kilometres, any pace." className="field" />
      </label>
      <fieldset>
        <legend className="label">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["single", "One run", "Run the distance in one go (5K, 10K challenges)"],
              ["total", "Total", "Add up kilometres over the dates"],
            ] as const
          ).map(([v, title, hint]) => (
            <label key={v} className={cn("cursor-pointer rounded-xl border px-3 py-2.5 text-[13px]", kind === v ? "border-navy bg-gray-100" : "border-line")}>
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => { setKind(v); setGoal(String(PRESETS[v][0])); }} className="sr-only" />
              <span className="block font-semibold">{title}</span>
              <span className="text-muted">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Goal (km)</span>
          <input name="goalKm" type="number" step="0.1" min={1} max={5000} value={goal} onChange={(e) => setGoal(e.target.value)} required className="field" />
          <span className="mt-1.5 flex flex-wrap gap-1">
            {PRESETS[kind].map((p) => (
              <button key={p} type="button" onClick={() => setGoal(String(p))} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold hover:border-gray-400">{p}K</button>
            ))}
          </span>
        </label>
        <label>
          <span className="label">Time target (optional)</span>
          <input name="maxTime" placeholder={kind === "single" ? "25:00" : "Single runs only"} disabled={kind !== "single"} maxLength={10} className="field tabular" />
        </label>
        <label>
          <span className="label">Starts</span>
          <input name="startsAt" type="date" defaultValue={today} required className="field" />
        </label>
        <label>
          <span className="label">Last day (empty = always open)</span>
          <input name="endsAt" type="date" className="field" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Occasion (optional)</span>
          <input name="occasion" maxLength={40} placeholder="Jamhuri Day" className="field" />
        </label>
        <fieldset>
          <legend className="label">Medal colour</legend>
          <div className="flex gap-2 pt-1">
            {CHALLENGE_ACCENTS.map((a) => (
              <label key={a} className="cursor-pointer">
                <input type="radio" name="accent" value={a} checked={accent === a} onChange={() => setAccent(a)} className="peer sr-only" />
                <span className={cn("block h-9 w-9 rounded-full ring-2 ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt", accent === a ? "ring-navy" : "ring-transparent", a === "green" ? "bg-green" : a === "cobalt" ? "bg-cobalt" : "bg-navy")} aria-label={a} />
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <label>
        <span className="label">For a cause (optional)</span>
        <input name="cause" maxLength={120} placeholder="Every 100 km buys running shoes for a school athlete in Iten" className="field" />
      </label>
      <label>
        <span className="label">Details</span>
        <textarea name="description" rows={4} maxLength={1200} placeholder="What counts, prizes, how finishers are celebrated…" className="field" />
      </label>
      {sponsors && (
        <label>
          <span className="label">Sponsor (optional)</span>
          <select name="sponsorId" defaultValue="" className="field">
            <option value="">No sponsor</option>
            {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…" className="btn-primary btn-lg btn-block">{submitLabel}</SubmitButton>
    </form>
  );
}
