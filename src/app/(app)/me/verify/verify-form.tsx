"use client";

import { useActionState, useState } from "react";
import { requestVerification } from "@/actions/profile";
import { FormMessage, SubmitButton } from "@/components/ui/forms";

const COPY = {
  athlete: {
    org: "Club, school or federation",
    orgPlaceholder: "Iten Track Club",
    details: "How can we confirm you? e.g. your club admin's name and phone, federation licence number, or a results link.",
  },
  club: {
    org: "Registration body",
    orgPlaceholder: "FKF Nairobi branch / Registrar of Societies",
    details: "Registration number, the two admins running the page, and your official social media links.",
  },
  scout: {
    org: "Agency or organisation",
    orgPlaceholder: "Amani Sports Agency",
    details: "Licence (e.g. FIFA agent number), organisation website, and two references we can contact.",
  },
} as const;

export function VerifyForm({ defaultType, legalName }: { defaultType: "athlete" | "club" | "scout"; legalName: string }) {
  const [state, action] = useActionState(requestVerification, undefined);
  const [type, setType] = useState(defaultType);
  const copy = COPY[type];
  if (state?.ok) return <div className="mt-6"><FormMessage state={state} /></div>;

  return (
    <form action={action} className="mt-6 flex flex-col gap-5">
      <div>
        <label className="label" htmlFor="type">Verify me as</label>
        <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field">
          <option value="athlete">Athlete (blue tick)</option>
          <option value="club">Club or crew (green tick)</option>
          <option value="scout">Scout or agency (grey tick)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="legalName">{type === "club" ? "Registered name" : "Full legal name"}</label>
        <input id="legalName" name="legalName" required defaultValue={legalName} maxLength={80} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="organisation">{copy.org}</label>
        <input id="organisation" name="organisation" maxLength={80} placeholder={copy.orgPlaceholder} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="details">Evidence</label>
        <textarea id="details" name="details" required rows={4} maxLength={1000} placeholder={copy.details} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="evidence">Supporting image (optional)</label>
        <input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-ink" />
        <p className="mt-2 text-xs text-muted">A club letter or registration certificate. Please don&apos;t upload your national ID here.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…" className="btn-primary btn-lg btn-block">Request verification</SubmitButton>
    </form>
  );
}
