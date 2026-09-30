"use client";

import { useActionState } from "react";
import { sendContactRequest } from "@/actions/social";
import { SubmitButton } from "@/components/ui/forms";

function Line({ name, placeholder, label, type = "text", autoComplete }: { name: string; placeholder: string; label: string; type?: string; autoComplete?: string }) {
  return (
    <label className="flex items-end gap-3 border-b border-navy/35 pb-2.5 pt-5 focus-within:border-navy">
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-navy/50"
      />
      <span className="shrink-0 text-[12px] font-medium text-navy/80">{label}</span>
    </label>
  );
}

/** The "ideas for collaboration?" form on the athlete portfolio (sits on the electric-green section). */
export function ContactForm({ athleteId, minor, firstName }: { athleteId: string; minor: boolean; firstName: string }) {
  const [state, action] = useActionState(sendContactRequest, undefined);

  if (state?.ok) {
    return (
      <div className="relative mt-8 rounded-2xl bg-navy p-5 text-white" role="status">
        <p className="h4">Asante!</p>
        <p className="mt-2 text-[15px] text-white/85">{state.ok}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative mt-4">
      <input type="hidden" name="athleteId" value={athleteId} />
      <Line name="firstName" placeholder="David" label="First name" autoComplete="given-name" />
      <Line name="lastName" placeholder="Otieno" label="Last name" autoComplete="family-name" />
      <Line name="email" type="email" placeholder="david@example.com" label="Email" autoComplete="email" />
      <label className="block border-b border-navy/35 pb-2.5 pt-5 focus-within:border-navy">
        <textarea
          name="message"
          required
          rows={3}
          placeholder={`Message for ${firstName}`}
          className="w-full resize-none bg-transparent text-[15px] text-navy outline-none placeholder:text-navy/50"
        />
      </label>
      {minor && (
        <p className="mt-4 rounded-xl bg-navy/10 px-3 py-2.5 text-[13px] text-navy">
          {firstName} is under 18. Your message goes to their guardian and club first, and every request is logged.
        </p>
      )}
      <label className="mt-5 flex items-center gap-3 text-[13px] text-navy">
        <input type="checkbox" name="terms" required className="h-5 w-5 shrink-0 appearance-none rounded-[4px] border-2 border-navy checked:bg-navy checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20d=%22M3.5%208.3l2.9%202.9%206-6.2%22%20fill=%22none%22%20stroke=%22%23B7F34A%22%20stroke-width=%222.6%22/%3E%3C/svg%3E')]" />
        <span>
          I accept the <b>Terms &amp; Conditions</b>
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="mt-4 rounded-xl bg-navy px-3 py-2.5 text-[13px] text-white">
          {state.error}
        </p>
      )}
      <SubmitButton pendingText="Sending…" className="btn-primary btn-lg btn-block mt-6">
        Submit message
      </SubmitButton>
    </form>
  );
}
