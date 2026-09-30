import { cn } from "@/lib/format";

/* Brand graphic elements from design/brand/15–16: chevrons and diagonal slash stripes. */

/** Green + cobalt chevrons with thin line chevrons, as on the "Brand pattern" board. */
export function ChevronPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid slice" className={cn("block", className)} aria-hidden>
      <rect width="700" height="300" fill="#081018" />
      <g fill="none" stroke="#3867FF" strokeOpacity=".45" strokeWidth="2">
        {[0, 22, 44].map((o) => (
          <path key={`l${o}`} d={`M${-10 + o} 60 L${60 + o} 150 L${-10 + o} 240`} />
        ))}
        {[0, 22, 44, 66].map((o) => (
          <path key={`r${o}`} d={`M${560 + o} 20 L${660 + o} 150 L${560 + o} 280`} />
        ))}
      </g>
      <path d="M40 0H170L290 150L170 300H40L160 150Z" fill="#B7F34A" />
      <path d="M200 0H340L460 150L340 300H200L320 150Z" fill="#3867FF" />
      <path d="M380 0H470L590 150L470 300H380L500 150Z" fill="#B7F34A" opacity=".75" />
    </svg>
  );
}

/** The splash screen's corner stripes: two slanted green and cobalt bars. */
export function SlashStripes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("block", className)} aria-hidden>
      <path d="M0 200L0 150L150 0L190 0L0 190Z" fill="#B7F34A" opacity=".9" />
      <path d="M60 200L200 60L200 110L110 200Z" fill="#3867FF" />
      <path d="M0 132L132 0L140 0L0 140Z" fill="#B7F34A" opacity=".35" />
    </svg>
  );
}

/** The hero cover's translucent green diagonal band. */
export function HeroSlash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{ background: "linear-gradient(180deg, rgba(183,243,74,.95), rgba(183,243,74,.25) 70%, transparent)", transform: "skewX(-32deg)" }}
    />
  );
}
