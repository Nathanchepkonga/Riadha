"use client";

import { useActionState } from "react";
import { createLeague, joinLeague } from "@/actions/fantasy";
import { FormMessage, SubmitButton } from "@/components/ui/forms";

export function LeagueForms() {
  const [created, create] = useActionState(createLeague, undefined);
  const [joined, join] = useActionState(joinLeague, undefined);
  return (
    <div className="mt-8 grid gap-4">
      <form action={join} className="card p-4">
        <p className="h5">Join a league</p>
        <p className="mt-1 text-sm text-muted">Got a code from WhatsApp? Paste it here.</p>
        <div className="mt-3 flex gap-2">
          <input name="code" required maxLength={10} placeholder="OFFICE7" className="field uppercase" autoCapitalize="characters" aria-label="League code" />
          <SubmitButton pendingText="…" className="btn-primary">Join</SubmitButton>
        </div>
        <div className="mt-2"><FormMessage state={joined} /></div>
      </form>
      <form action={create} className="card p-4">
        <p className="h5">Create a league</p>
        <p className="mt-1 text-sm text-muted">For your office, chama, estate or class. You&apos;ll get an invite link.</p>
        <div className="mt-3 flex gap-2">
          <input name="name" required maxLength={40} placeholder="Upper Hill Office League" className="field" aria-label="League name" />
          <SubmitButton pendingText="…" className="btn-accent">Create</SubmitButton>
        </div>
        <div className="mt-2"><FormMessage state={created} /></div>
      </form>
    </div>
  );
}
