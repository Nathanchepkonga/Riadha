"use client";

import { useId, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/format";

/* Search and Toggle, ported from the UI kit sheets of the same names. */

/**
 * Search field: leading magnifier, clear (×) button once there's text, focus ring, sm/md/lg.
 * Uncontrolled by default so it works inside plain GET forms.
 */
export function SearchField({
  name = "q",
  defaultValue = "",
  placeholder = "Search",
  fieldSize = "md",
  onValueChange,
  className,
  disabled,
  autoFocus,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  fieldSize?: "sm" | "md" | "lg";
  onValueChange?: (v: string) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);
  // Text stays 16px on phones (see .field) so iOS never zooms; desktop gets the kit sizes.
  const h = { sm: "h-9 md:text-[14px]", md: "h-11 md:text-[15px]", lg: "h-12 text-[16px]" }[fieldSize];
  const set = (v: string) => {
    setValue(v);
    onValueChange?.(v);
  };
  return (
    <div className={cn("relative", className)}>
      <Search size={17} className={cn("pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2", disabled ? "text-subtle" : "text-muted")} aria-hidden />
      <input
        ref={input}
        type="search"
        name={name}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className={cn("field pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none", h)}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            set("");
            input.current?.focus();
          }}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-gray-100 hover:text-ink"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Toggle switch (role="switch"). Default size shows the value text beside it; `small` puts a
 * check in the knob, as in the kit. Submits `name=on` inside forms via a hidden input.
 */
export function Toggle({
  label,
  onText = "On",
  offText = "Off",
  checked: controlled,
  defaultChecked = false,
  onChange,
  name,
  small,
  disabled,
  className,
}: {
  label?: React.ReactNode;
  onText?: string;
  offText?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  name?: string;
  small?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = controlled ?? inner;
  const id = useId();
  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      {label && <span id={id} className={cn("text-[12px] font-medium", disabled ? "text-subtle" : "text-muted")}>{label}</span>}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={label ? id : undefined}
          disabled={disabled}
          onClick={() => {
            setInner(!on);
            onChange?.(!on);
          }}
          className={cn(
            "relative shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
            small ? "h-4 w-8" : "h-6 w-11",
            disabled ? "bg-gray-200" : on ? "bg-green" : "bg-gray-400",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full shadow transition-[left]",
              small ? "h-3 w-3" : "h-[18px] w-[18px]",
              disabled ? "bg-gray-100" : on ? "bg-navy" : "bg-white",
              on ? (small ? "left-[18px]" : "left-[23px]") : small ? "left-[2px]" : "left-[3px]",
            )}
          >
            {small && on && <Check size={8} strokeWidth={4} className="text-green" />}
          </span>
        </button>
        {!small && <span className={cn("text-[14px]", disabled ? "text-subtle" : "text-ink")}>{on ? onText : offText}</span>}
      </div>
      {name && <input type="hidden" name={name} value={on ? "on" : ""} />}
    </div>
  );
}
