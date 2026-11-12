"use client";

import { useActionState } from "react";
import { submitTimeTrial } from "@/actions/running";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { TRIAL_EVENTS } from "@/lib/running/constants";

export function TrialForm({ clubs, defaults }: { clubs: { id: string; displayName: string; county: string | null }[]; defaults: { event?: string; time?: string; activityId?: number; date: string } }) {
  const [state, action] = useActionState(submitTimeTrial, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Event</span>
          <select name="event" defaultValue={defaults.event ?? ""} required className="field">
            <option value="" disabled>Choose</option>
            {TRIAL_EVENTS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Time</span>
          <input name="time" defaultValue={defaults.time ?? ""} required placeholder="1:47.9" inputMode="decimal" maxLength={12} className="field tabular" />
        </label>
        <label>
          <span className="label">Date</span>
          <input name="date" type="date" defaultValue={defaults.date} max={defaults.date} required className="field" />
        </label>
        <label>
          <span className="label">Where</span>
          <input name="venue" required maxLength={80} placeholder="Kamariny Stadium" className="field" />
        </label>
      </div>
      <label>
        <span className="label">Club that will confirm it</span>
        <select name="verifierId" defaultValue="" required className="field">
          <option value="" disabled>Choose a verified club</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.displayName}{c.county ? ` · ${c.county}` : ""}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Note for the club (optional)</span>
        <textarea name="note" rows={2} maxLength={300} placeholder="Heat 2, timed by Coach Rono. Results sheet on the club noticeboard." className="field" />
      </label>
      <input type="hidden" name="activityId" value={defaults.activityId ?? ""} />
      {defaults.activityId && <p className="rounded-lg bg-gray-100 px-3 py-2 text-[12px] text-muted">The club will see the GPS run you came from.</p>}
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…" className="btn-primary btn-lg btn-block">Ask the club to confirm</SubmitButton>
    </form>
  );
}
