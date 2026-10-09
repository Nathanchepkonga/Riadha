import { useId } from "react";
import { cn } from "@/lib/format";

/*
 * Brand graphic elements from the kit (Guidelines/riadha-brand-pattern, pattern tile, splash screens).
 * Forward chevrons and speed stripes share the mark's diagonal: every slanted edge rises 0.769 across
 * per unit up (≈37.6° from vertical, `--brand-slant` in globals.css). Keep them behind content, never
 * behind the logo.
 */

/** The kit's brand pattern: outline chevrons, then green, cobalt and green solid chevrons. */
export function ChevronPattern({ className, panel = true }: { className?: string; panel?: boolean }) {
  const outline = (x: number) => `M${x},280 L${x + 14},280 L${x + 244.77},580 L${x + 14},880 L${x},880 L${x + 230.77},580Z`;
  const solid = (x: number) => `M${x},280 L${x + 150},280 L${x + 380.77},580 L${x + 150},880 L${x},880 L${x + 230.77},580Z`;
  const clip = useId();
  return (
    <svg viewBox="80 240 1440 680" preserveAspectRatio="xMidYMid slice" className={cn("block", className)} aria-hidden>
      <clipPath id={clip}>
        <rect x="80" y="240" width="1440" height="680" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {panel && <rect x="80" y="240" width="1440" height="680" fill="#111C28" />}
        <g fill="none" stroke="#3867FF" strokeOpacity=".35" strokeWidth="2">
          {[-60, -20, 20, 60, 100, 140, 1150, 1190, 1230, 1270, 1310, 1350, 1390].map((x) => (
            <path key={x} d={outline(x)} />
          ))}
        </g>
        <path d={solid(260)} fill="#B7F34A" />
        <path d={solid(560)} fill="#3867FF" />
        <path d={solid(860)} fill="#B7F34A" fillOpacity=".9" />
      </g>
    </svg>
  );
}

/** Outline chevrons only, for quiet backgrounds on navy. */
export function ChevronLines({ className, count = 7, color = "#3867FF", opacity = 0.35 }: { className?: string; count?: number; color?: string; opacity?: number }) {
  return (
    <svg viewBox={`0 0 ${40 * count + 260} 600`} className={cn("block", className)} aria-hidden>
      <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth="2">
        {Array.from({ length: count }, (_, i) => {
          const x = i * 40;
          return <path key={i} d={`M${x},0 L${x + 14},0 L${x + 244.77},300 L${x + 14},600 L${x},600 L${x + 230.77},300Z`} />;
        })}
      </g>
    </svg>
  );
}

/**
 * The splash screen's speed stripes (kit Splash_Screens, portrait): green, cobalt and 55% green bars
 * rising at the brand angle. `fade` softens them towards the top, as in the kit's splash mockup.
 */
export function SpeedStripes({ className, fade, animated }: { className?: string; fade?: boolean; animated?: boolean }) {
  const mask = useId();
  return (
    <svg viewBox="-40 1306 840 624" className={cn("block", className)} aria-hidden>
      {fade && (
        <defs>
          <linearGradient id={`${mask}g`} x1="0" y1="1" x2="0.62" y2="0">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.55" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={mask} maskUnits="userSpaceOnUse" x="-40" y="1306" width="840" height="624">
            <rect x="-40" y="1306" width="840" height="624" fill={`url(#${mask}g)`} />
          </mask>
        </defs>
      )}
      <g mask={fade ? `url(#${mask})` : undefined}>
        <path className={animated ? "stripe-in stripe-in-1" : undefined} d="M-40,1930 L32,1930 L512,1306 L440,1306Z" fill="#B7F34A" />
        <path className={animated ? "stripe-in stripe-in-2" : undefined} d="M104,1930 L156.8,1930 L636.8,1306 L584,1306Z" fill="#3867FF" />
        <path className={animated ? "stripe-in stripe-in-3" : undefined} d="M248,1930 L320,1930 L800,1306 L728,1306Z" fill="#B7F34A" fillOpacity=".55" />
      </g>
    </svg>
  );
}

/** Corner speed stripes (kept for existing call sites). */
export function SlashStripes({ className }: { className?: string }) {
  return <SpeedStripes className={className} fade />;
}

/** A translucent green band at the brand angle, for hero covers. */
export function HeroSlash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{ background: "linear-gradient(180deg, rgba(183,243,74,.95), rgba(183,243,74,.25) 70%, transparent)", transform: "skewX(calc(-1 * var(--brand-slant)))" }}
    />
  );
}

/**
 * Ambient light for navy surfaces: slow-drifting green and cobalt glows plus the kit's speed-stripe
 * tile. Purely decorative; it sits behind content (`absolute inset-0`) and pauses for reduced motion.
 */
export function Aurora({ className, stripes = true, intensity = 1 }: { className?: string; stripes?: boolean; intensity?: number }) {
  return (
    <div aria-hidden className={cn("aurora pointer-events-none absolute inset-0 overflow-hidden", className)} style={{ "--aurora": intensity } as React.CSSProperties}>
      <span className="aurora-blob aurora-blob-green" />
      <span className="aurora-blob aurora-blob-cobalt" />
      <span className="aurora-blob aurora-blob-lime" />
      {stripes && <span className="bg-speed-tile absolute inset-0 opacity-60" />}
      <span className="aurora-grain absolute inset-0" />
    </div>
  );
}
