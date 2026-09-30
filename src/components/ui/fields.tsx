"use client";

import { AlertTriangle, CircleAlert } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/format";

/*
 * Form fields ported from the UI kit's "Text input" sheet: label, helper, error (red ring + icon),
 * warning (amber icon), disabled and skeleton states, in sm / md / lg.
 */

type FieldSize = "sm" | "md" | "lg";
const SIZE: Record<FieldSize, string> = { sm: "field-sm", md: "", lg: "field-lg" };

type Common = { label?: React.ReactNode; helper?: React.ReactNode; error?: string | null; warning?: string | null; fieldSize?: FieldSize };

function Message({ id, error, warning, helper }: { id: string; error?: string | null; warning?: string | null; helper?: React.ReactNode }) {
  if (error) return <p id={id} className="helper text-danger">{error}</p>;
  if (warning) return <p id={id} className="helper text-ink">{warning}</p>;
  if (helper) return <p id={id} className="helper">{helper}</p>;
  return null;
}

function StateIcon({ error, warning }: { error?: string | null; warning?: string | null }) {
  if (error) return <CircleAlert size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fill-danger text-white" aria-hidden />;
  if (warning) return <AlertTriangle size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fill-warning text-navy" aria-hidden />;
  return null;
}

export function TextField({ label, helper, error, warning, fieldSize = "md", className, id, ...rest }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className={cn("label", rest.disabled && "text-subtle")}>{label}</label>}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || warning || helper ? msgId : undefined}
          className={cn("field", SIZE[fieldSize], (error || warning) && "pr-10", warning && !error && "border-b-2 border-b-warning")}
          {...rest}
        />
        <StateIcon error={error} warning={warning} />
      </div>
      <Message id={msgId} error={error} warning={warning} helper={helper} />
    </div>
  );
}

export function TextArea({ label, helper, error, className, id, ...rest }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <textarea id={inputId} aria-invalid={error ? true : undefined} className="field" {...rest} />
      <Message id={`${inputId}-msg`} error={error} helper={helper} />
    </div>
  );
}

export function SelectField({ label, helper, error, fieldSize = "md", className, id, children, ...rest }: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <select id={inputId} aria-invalid={error ? true : undefined} className={cn("field", SIZE[fieldSize])} {...rest}>
        {children}
      </select>
      <Message id={`${inputId}-msg`} error={error} helper={helper} />
    </div>
  );
}

/** Loading placeholder matching a labelled field. */
export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="skeleton mb-2 h-3 w-16" />
      <div className="skeleton h-11 w-full rounded-lg" />
    </div>
  );
}
