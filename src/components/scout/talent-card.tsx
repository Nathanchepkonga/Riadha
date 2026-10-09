import Link from "next/link";
import { Clapperboard, MapPin, Plane, Sparkles, Users } from "lucide-react";
import type { Talent } from "@/lib/scout";
import { ageFrom, compact } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Tick } from "@/components/ui/tick";
import { BookmarkButton } from "./bookmark-button";

/** A search result in the Scout Portal: who, where, what they're good at, and their best numbers. */
export function TalentCard({ t }: { t: Talent }) {
  const age = ageFrom(t.dateOfBirth);
  const facts = [t.position, age !== null ? `${age} yrs` : null, t.heightCm ? `${t.heightCm} cm` : null, t.preferredSide ? `${t.preferredSide} side` : null].filter(Boolean);
  return (
    <article data-reveal="up" className="card pressable group relative overflow-hidden p-4 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(8,16,24,.45)]">
      <Link href={`/u/${t.handle}`} className="absolute inset-0 z-0" aria-label={`Open ${t.displayName}'s profile`} />
      <div className="pointer-events-none relative flex items-start gap-3">
        <span className="relative">
          <Avatar name={t.displayName} url={t.avatarUrl} size={56} />
          {age !== null && age < 18 && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-navy px-1.5 text-[9px] font-bold uppercase tracking-wider text-white" title="Under 18: contact goes to guardian and club">
              U18
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{t.displayName}</span>
            <Tick role="athlete" verified={t.verified} size={15} />
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{[t.sport, ...facts].join(" · ")}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <MapPin size={12} /> {t.county ?? "Kenya"}
            <span className="mx-1 text-line">|</span>
            <Users size={12} /> {compact(t.followers)}
            {t.videos > 0 && (
              <>
                <span className="mx-1 text-line">|</span>
                <Clapperboard size={12} /> {t.videos}
              </>
            )}
          </p>
        </div>
        <span className="pointer-events-auto relative z-10">
          <BookmarkButton athleteId={t.id} saved={t.saved} />
        </span>
      </div>

      {(t.openToOpportunities || t.willingToRelocate) && (
        <div className="pointer-events-none relative mt-3 flex flex-wrap gap-1.5">
          {t.openToOpportunities && (
            <span className="inline-flex items-center gap-1 rounded-md bg-green px-2 py-1 text-[11px] font-semibold text-navy">
              <Sparkles size={12} /> Open to opportunities
            </span>
          )}
          {t.willingToRelocate && (
            <span className="inline-flex items-center gap-1 rounded-md bg-navy px-2 py-1 text-[11px] font-semibold text-white">
              <Plane size={12} /> Will relocate
            </span>
          )}
        </div>
      )}

      {t.skills.length > 0 && (
        <ul className="pointer-events-none relative mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
          {t.skills.slice(0, 5).map((s) => (
            <li key={s} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium">
              {s}
            </li>
          ))}
          {t.skills.length > 5 && <li className="px-1 py-1 text-[12px] text-muted">+{t.skills.length - 5}</li>}
        </ul>
      )}

      {t.stats.length > 0 && (
        <dl className="pointer-events-none relative mt-3 grid grid-cols-2 gap-2">
          {t.stats.map((s) => (
            <div key={s.id} className="rounded-xl bg-navy px-3 py-2.5 text-white">
              <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">{s.label}</dt>
              <dd className="mt-0.5 text-[22px] font-bold leading-none tracking-[-0.03em] tabular">
                {s.value}
                {s.verifiedByClub && <span className="ml-1.5 align-middle text-[10px] font-semibold text-green">✓ club</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
