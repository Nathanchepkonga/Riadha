"use client";

import { useOptimistic, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleBookmark } from "@/actions/scout";
import { burst, haptic } from "@/lib/celebrate";
import { cn } from "@/lib/format";

/** Save an athlete to the scout's shortlist (or remove them). `variant="full"` shows a labelled button. */
export function BookmarkButton({ athleteId, saved, variant = "icon", tone = "light", className }: { athleteId: string; saved: boolean; variant?: "icon" | "full"; tone?: "light" | "dark"; className?: string }) {
  const [on, setOn] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const label = on ? "Saved to shortlist" : "Save to shortlist";

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!on) {
      haptic();
      burst(e.currentTarget, { count: 8, spread: 44 });
    }
    start(async () => {
      setOn(!on);
      await toggleBookmark(athleteId);
    });
  };

  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} disabled={pending} aria-pressed={on} className={cn("btn btn-sm", on ? "btn-accent" : tone === "dark" ? "btn-light" : "btn-secondary", className)}>
        {on ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        {on ? "Shortlisted" : "Shortlist"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "pressable grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
        on ? "bg-green text-navy" : tone === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-ink hover:bg-gray-200",
        className,
      )}
    >
      {on ? <BookmarkCheck size={18} className="animate-heart-pop" /> : <Bookmark size={18} />}
    </button>
  );
}
