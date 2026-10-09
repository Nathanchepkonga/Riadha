import Link from "next/link";
import { BadgeCheck, Dumbbell, GraduationCap, HeartPulse, LandPlot, MapPin, Salad, ShoppingBag, Store, Target, type LucideIcon } from "lucide-react";
import type { Business } from "@/db/schema";
import { categoryLabel } from "@/lib/constants";
import { cn } from "@/lib/format";
import { ChevronLines } from "@/components/brand/graphics";
import { BusinessLogo } from "./ad-card";

const ICONS: Record<string, LucideIcon> = {
  gym: Dumbbell,
  academy: GraduationCap,
  shop: ShoppingBag,
  physio: HeartPulse,
  coach: Target,
  venue: LandPlot,
  nutrition: Salad,
};

function CategoryGlyph({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? Store;
  return <Icon size={56} strokeWidth={1.5} className={className} />;
}

const SKINS = [
  { bg: "bg-navy", fg: "text-green", lines: "#3867FF", op: 0.4 },
  { bg: "bg-cobalt", fg: "text-white", lines: "#FFFFFF", op: 0.2 },
  { bg: "bg-navy-2", fg: "text-green", lines: "#B7F34A", op: 0.22 },
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Cover photo, or brand art (chevrons + category glyph) when the business hasn't uploaded one. */
export function BusinessCover({ b, className }: { b: Pick<Business, "name" | "coverUrl" | "category">; className?: string }) {
  if (b.coverUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-navy", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner uploads served from /media */}
        <img src={b.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
    );
  }
  const skin = SKINS[hash(b.name) % SKINS.length];
  return (
    <div className={cn("relative overflow-hidden", skin.bg, className)} aria-hidden>
      <ChevronLines className="absolute -left-12 top-1/2 h-[190%] w-auto -translate-y-1/2 transition-transform duration-700 group-hover:translate-x-3" count={7} color={skin.lines} opacity={skin.op} />
      <CategoryGlyph category={b.category} className={cn("absolute bottom-3 right-4 opacity-90 transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110", skin.fg)} />
    </div>
  );
}

export function VerifiedBusiness({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white", className)} title="Checked by the Riadha team">
      <BadgeCheck size={11} className="text-green" /> Verified
    </span>
  );
}

export const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

/** Marketplace listing card. */
export function BusinessCard({ b }: { b: Business }) {
  return (
    <Link href={`/market/${b.slug}`} data-reveal="up" className="card pressable group block overflow-hidden">
      <BusinessCover b={b} className="aspect-[16/8]" />
      <div className="relative px-4 pb-4">
        <BusinessLogo name={b.name} url={b.logoUrl} size={48} className="-mt-6 ring-4 ring-surface" />
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">{b.name}</p>
            <p className="flex items-center gap-1 text-[12px] text-muted">
              {categoryLabel(b.category)} · <MapPin size={11} /> {b.county}
            </p>
          </div>
          {b.verified && <VerifiedBusiness className="shrink-0" />}
        </div>
        {b.amenities.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {b.amenities.slice(0, 3).map((a) => (
              <li key={a} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium">
                {a}
              </li>
            ))}
            {b.amenities.length > 3 && <li className="px-1 py-1 text-[11px] text-muted">+{b.amenities.length - 3}</li>}
          </ul>
        )}
        {b.priceFrom !== null && (
          <p className="mt-3 text-[13px]">
            <span className="text-muted">From </span>
            <span className="font-bold">{ksh(b.priceFrom)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
