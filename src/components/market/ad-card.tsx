"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import type { Placement, ServedAd } from "@/lib/ads";
import { categoryLabel } from "@/lib/constants";
import { cn } from "@/lib/format";

/** Sends one impression beacon the first time at least half the ad is on screen for a moment. */
function useImpression(id: number, placement: Placement) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer = window.setTimeout(() => {
          const url = `/api/ads/${id}/impression?p=${placement}`;
          if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true }).catch(() => {});
          io.disconnect();
        }, 800);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [id, placement]);
  return ref;
}

/** In-feed sponsored card (Home, Marketplace). Clicks go through /ad/[id] so they're counted. */
export function AdCard({ ad, placement, className }: { ad: ServedAd; placement: Placement; className?: string }) {
  const ref = useImpression(ad.id, placement);
  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={`/ad/${ad.id}?p=${placement}`}
      rel="sponsored"
      className={cn("pressable edge-glow group relative block overflow-hidden rounded-3xl bg-navy text-white", className)}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-navy-2">
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- advertiser uploads served from /media
          <img src={ad.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <span className="bg-speed-tile absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-navy/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">Sponsored</span>
      </div>
      <div className="relative -mt-10 p-4 pt-0">
        <div className="flex items-center gap-2">
          <BusinessLogo name={ad.business.name} url={ad.business.logoUrl} size={36} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[13px] font-semibold">
              {ad.business.name}
              {ad.business.verified && <BadgeCheck size={14} className="shrink-0 text-green" aria-label="Verified business" />}
            </p>
            <p className="text-[11px] text-white/55">
              {categoryLabel(ad.business.category)} · {ad.business.county}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[19px] font-bold leading-tight tracking-[-0.02em]">{ad.headline}</p>
        <p className="mt-1 line-clamp-2 text-[14px] text-white/70">{ad.body}</p>
        <span className="btn btn-accent btn-sm mt-4">
          {ad.ctaLabel} <ArrowUpRight size={14} />
        </span>
      </div>
    </a>
  );
}

/** Full-screen sponsored reel for the Watch feed. */
export function AdReel({ ad }: { ad: ServedAd }) {
  const ref = useImpression(ad.id, "watch");
  return (
    <article ref={ref as React.RefObject<HTMLElement>} className="relative h-full w-full overflow-hidden bg-navy text-white" aria-label={`Sponsored: ${ad.business.name}`}>
      {ad.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- advertiser uploads served from /media
        <img src={ad.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="bg-speed-tile absolute inset-0" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-navy/10" />
      <div className="absolute inset-x-0 bottom-0 p-5 pb-[calc(var(--tabbar-h)+1.25rem)]">
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur">Sponsored</span>
        <div className="mt-4 flex items-center gap-2.5">
          <BusinessLogo name={ad.business.name} url={ad.business.logoUrl} size={40} />
          <p className="flex items-center gap-1 font-semibold">
            {ad.business.name}
            {ad.business.verified && <BadgeCheck size={15} className="text-green" aria-label="Verified business" />}
          </p>
        </div>
        <p className="mt-3 text-[28px] font-bold leading-[1.05] tracking-[-0.03em]">{ad.headline}</p>
        <p className="mt-2 max-w-[36ch] text-[15px] text-white/75">{ad.body}</p>
        <a href={`/ad/${ad.id}?p=watch`} rel="sponsored" className="btn btn-accent btn-lg btn-block mt-5">
          {ad.ctaLabel} <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}

/** Square business logo, or initials on the brand tile. */
export function BusinessLogo({ name, url, size = 40, className }: { name: string; url: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-green font-bold text-navy ring-1 ring-white/10", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner uploads served from /media
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
