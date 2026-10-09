"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { MapPin, Sparkles, Trash2 } from "lucide-react";
import { removeBookmark, updateBookmark } from "@/actions/scout";
import type { ScoutStage } from "@/db/schema";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { Tick } from "@/components/ui/tick";
import { celebrate } from "@/lib/celebrate";
import { ageFrom, cn, timeAgo } from "@/lib/format";

const STAGES: { value: ScoutStage; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "contacted", label: "Contacted" },
  { value: "trial", label: "Trial" },
  { value: "signed", label: "Signed" },
];

type Entry = {
  stage: ScoutStage;
  note: string | null;
  updatedAt: string;
  athlete: { id: string; handle: string; displayName: string; verified: boolean; avatarUrl: string | null; sport: string | null; position: string | null; county: string | null; dateOfBirth: string | null; openToOpportunities: boolean };
};

/** One athlete in the scout's pipeline: stage stepper, private notes, remove. */
export function ShortlistItem({ entry }: { entry: Entry }) {
  const [state, action] = useActionState(updateBookmark.bind(null, entry.athlete.id), undefined);
  const [removing, start] = useTransition();
  const a = entry.athlete;
  const age = ageFrom(a.dateOfBirth);
  const current = STAGES.findIndex((s) => s.value === entry.stage);

  return (
    <article data-reveal="up" className={cn("card p-4 transition-opacity", removing && "opacity-40")}>
      <div className="flex items-start gap-3">
        <Link href={`/u/${a.handle}`}>
          <Avatar name={a.displayName} url={a.avatarUrl} size={48} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${a.handle}`} className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{a.displayName}</span>
            <Tick role="athlete" verified={a.verified} size={14} />
          </Link>
          <p className="truncate text-[13px] text-muted">{[a.sport, a.position, age !== null ? `${age} yrs` : null].filter(Boolean).join(" · ")}</p>
          <p className="flex items-center gap-1 text-[12px] text-muted">
            <MapPin size={12} /> {a.county ?? "Kenya"} · updated {timeAgo(new Date(entry.updatedAt))}
            {a.openToOpportunities && <Sparkles size={12} className="ml-1 text-cobalt" aria-label="Open to opportunities" />}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Remove ${a.displayName} from shortlist`}
          disabled={removing}
          onClick={() => start(() => removeBookmark(a.id))}
          className="pressable grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <form
        action={(fd) => {
          if (fd.get("stage") === "signed" && entry.stage !== "signed") celebrate();
          return action(fd);
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <fieldset>
          <legend className="sr-only">Stage</legend>
          <div className="relative grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
            {STAGES.map((s, i) => (
              <label key={s.value} className="relative cursor-pointer">
                <input type="radio" name="stage" value={s.value} defaultChecked={entry.stage === s.value} className="peer sr-only" />
                <span
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-[12px] font-semibold text-muted transition-colors peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt",
                    i < current && "text-ink",
                  )}
                >
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <textarea name="note" defaultValue={entry.note ?? ""} maxLength={1000} rows={2} placeholder="Private notes: strengths, next steps, contact made…" aria-label="Notes" className="field min-h-20" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <FormMessage state={state} />
          </div>
          <SubmitButton pendingText="Saving…" className="btn-primary btn-sm">Save</SubmitButton>
        </div>
      </form>
    </article>
  );
}
