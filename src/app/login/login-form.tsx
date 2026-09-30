"use client";

import { useActionState } from "react";
import { confirmOtp, requestOtp, type OtpState } from "@/actions/auth";
import { maskPhone } from "@/lib/auth/phone";
import { SubmitButton } from "@/components/ui/forms";

export function LoginForm({ next }: { next?: string }) {
  const [sent, send] = useActionState<OtpState, FormData>(requestOtp, { step: "phone" });
  const [checked, check] = useActionState<OtpState, FormData>(confirmOtp, { step: "phone" });

  if (sent.step === "phone") {
    return (
      <form action={send} className="flex flex-col gap-4">
        <label className="label" htmlFor="phone">
          Phone number
        </label>
        <div className="flex gap-2">
          <span className="field flex w-20 shrink-0 items-center justify-center font-semibold text-muted">+254</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            required
            className="field tabular"
          />
        </div>
        {sent.error && <p role="alert" className="text-sm text-danger">{sent.error}</p>}
        <SubmitButton pendingText="Sending code…" className="btn-accent btn-lg btn-block">
          Continue
        </SubmitButton>
        <p className="text-center text-xs text-muted">Safaricom, Airtel and Telkom numbers work.</p>
      </form>
    );
  }

  const error = checked.step === "code" && checked.phone === sent.phone ? checked.error : sent.error;
  return (
    <form action={check} className="flex flex-col gap-4">
      <input type="hidden" name="phone" value={sent.phone} />
      {next && <input type="hidden" name="next" value={next} />}
      <label className="label" htmlFor="code">
        Code sent to {maskPhone(sent.phone)}
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="••••••"
        autoFocus
        required
        className="field h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular"
        defaultValue={sent.devCode ?? ""}
      />
      {sent.devCode && (
        <p className="rounded-lg border-l-4 border-cobalt bg-cobalt/8 px-4 py-3 text-sm">
          Dev mode: SMS is off, so your code is <b className="tabular">{sent.devCode}</b> (already filled in).
        </p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <SubmitButton pendingText="Checking…" className="btn-accent btn-lg btn-block">
        Verify and continue
      </SubmitButton>
      <button type="button" onClick={() => window.location.reload()} className="text-sm font-semibold text-cobalt hover:underline">
        Use a different number
      </button>
    </form>
  );
}
