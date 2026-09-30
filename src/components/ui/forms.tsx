"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/format";

export type FormState = { error?: string; ok?: string } | undefined;

export function SubmitButton({ children, pendingText, className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn("btn", className ?? "btn-primary")}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cn(
        "rounded-lg border-l-4 px-4 py-3 text-sm",
        state.error ? "border-danger bg-danger/8 text-ink" : "border-green bg-green/20 text-ink",
      )}
    >
      {state.error ?? state.ok}
    </p>
  );
}
