import { useId } from "react";
import { cn } from "@/lib/format";
import { LOCKUPS, MARK_D, MARK_VIEWBOX, TAGLINE_D, WORD_D, type Lockup } from "./logo-art";

/*
 * Riadha logo system from the official brand kit (design/brand-kit/Riadha_Brand_Kit/Logo/SVG).
 * The artwork is the kit's vector outlines, placed exactly as in its lockups. Never retype, redraw,
 * stretch, rotate, recolour, add effects to or re-space it. Minimum sizes (kit): primary/horizontal
 * 140px wide, stacked 90px, icon 16px; drop the tagline below 160px wide (use `compact`).
 */

/** The mark's two pieces: the "r" and the speed slash. */
export const MARK_PARTS = MARK_D.split(/Z(?=M)/).map((d, i, all) => (i < all.length - 1 ? `${d}Z` : d));

const C = { navy: "#081018", white: "#FFFFFF", green: "#B7F34A", greenDeep: "#8DD63A", black: "#000000" };

export type LogoTheme = "light" | "dark" | "mono-dark" | "mono-light" | "mono-black" | "mono-green";

/** Kit variants: full-color (light), full-color-reversed (dark), and the single-colour versions. */
function palette(theme: LogoTheme) {
  switch (theme) {
    case "dark":
      return { mark: "gradient", ink: C.white, dot: C.green, rule: 0.35 };
    case "mono-dark":
      return { mark: C.navy, ink: C.navy, dot: C.navy, rule: 1 };
    case "mono-light":
      return { mark: C.white, ink: C.white, dot: C.white, rule: 1 };
    case "mono-black":
      return { mark: C.black, ink: C.black, dot: C.black, rule: 1 };
    case "mono-green":
      return { mark: C.green, ink: C.green, dot: C.green, rule: 1 };
    default:
      return { mark: "gradient", ink: C.navy, dot: C.greenDeep, rule: 0.35 };
  }
}

/** The mark gradient (#8DD63A → #B7F34A along the mark's diagonal), in the mark's own coordinates. */
function MarkGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="407.5" x2="519" y2="0">
      <stop offset="0" stopColor={C.greenDeep} />
      <stop offset="1" stopColor={C.green} />
    </linearGradient>
  );
}

const place = ([x, y, k]: readonly [number, number, number]) => `translate(${x} ${y}) scale(${k})`;

// Mark + wordmark without the tagline, cropped from the horizontal lockup (for app bars, < 160px).
const COMPACT: Lockup = { viewBox: [1374.46, 252.07], mark: LOCKUPS.horizontal.mark, word: LOCKUPS.horizontal.word };
// Wordmark height in lockup units; `size` sets this height on screen and everything scales with it.
const WORD_H = 238.8;

type Variant = "primary" | "horizontal" | "stacked" | "wordmark" | "compact";

/**
 * A logo lockup. `size` is the wordmark's height (px number or any CSS length, e.g. a clamp());
 * `animated` plays the brand intro (mark pieces slide in along the diagonal, wordmark wipes on).
 */
export function Logo({
  variant = "primary",
  theme = "light",
  size = 32,
  animated,
  className,
}: {
  variant?: Variant;
  theme?: LogoTheme;
  size?: number | string;
  animated?: boolean;
  className?: string;
}) {
  const gid = useId();
  const lock = variant === "compact" ? COMPACT : LOCKUPS[variant];
  const p = palette(theme);
  const [w, h] = lock.viewBox;
  const scale = (n: number) => (typeof size === "number" ? `${((n * size) / WORD_H).toFixed(2)}px` : `calc(${size} * ${(n / WORD_H).toFixed(4)})`);
  const markFill = p.mark === "gradient" ? `url(#${gid})` : p.mark;
  const label = lock.tag ? "Riadha: Sport, Talent, Scouting" : "Riadha";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className={cn("block shrink-0", animated && "logo-intro", className)}
      style={{ width: scale(w), height: scale(h) }}
    >
      {lock.mark && (
        <g transform={place(lock.mark)}>
          {p.mark === "gradient" && <MarkGradient id={gid} />}
          {MARK_PARTS.map((d, i) => (
            <path key={i} d={d} fill={markFill} className={animated ? `logo-intro-mark${i}` : undefined} />
          ))}
        </g>
      )}
      {lock.word && (
        <g transform={place(lock.word)}>
          <path d={WORD_D} transform="translate(-19.8 0)" fill={p.ink} className={animated ? "logo-intro-word" : undefined} />
        </g>
      )}
      {lock.rule && <rect x={lock.rule[0]} y={lock.rule[1]} width={lock.rule[2]} height={lock.rule[3]} fill={p.ink} opacity={p.rule} />}
      {lock.tag && lock.tagParts && (
        <g transform={place(lock.tag)} className={animated ? "logo-intro-tag" : undefined}>
          {lock.tagParts.map(([x, y, k], i) => (
            <path key={i} d={TAGLINE_D[i]} transform={`translate(${x} ${y}) scale(${k})`} fill={p.ink} />
          ))}
          {lock.dots?.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={p.dot} />)}
        </g>
      )}
    </svg>
  );
}

/** The "r" mark on its own (kit icon-* files). `tone="gradient"` is full colour. */
export function LogoMark({
  tone = "gradient",
  className,
  title,
  animated,
}: {
  tone?: "gradient" | "green" | "navy" | "white" | "black";
  className?: string;
  title?: string;
  animated?: boolean;
}) {
  const gid = useId();
  const fill = tone === "gradient" ? `url(#${gid})` : { green: C.green, navy: C.navy, white: C.white, black: C.black }[tone];
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEWBOX[0]} ${MARK_VIEWBOX[1]}`}
      className={cn("h-auto shrink-0", animated && "logo-intro", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {tone === "gradient" && <MarkGradient id={gid} />}
      {MARK_PARTS.map((d, i) => (
        <path key={i} d={d} fill={fill} className={animated ? `logo-intro-mark${i}` : undefined} />
      ))}
    </svg>
  );
}

/**
 * Kit app icons. `favicon`: navy rounded square, solid green mark (Favicon/favicon.svg).
 * `app`: green square, navy mark (App_Icon/ios). `dark`: navy square, gradient mark (dark variant).
 */
export function AppIcon({ variant = "favicon", size = 48, className }: { variant?: "favicon" | "app" | "dark"; size?: number; className?: string }) {
  const gid = useId();
  const bg = variant === "app" ? C.green : C.navy;
  const fill = variant === "app" ? C.navy : variant === "dark" ? `url(#${gid})` : C.green;
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <rect width="1024" height="1024" rx={variant === "favicon" ? 224 : 230} fill={bg} />
      <g transform={variant === "favicon" ? "translate(120.6 221.24) scale(1.46436)" : "translate(203 282.45) scale(1.15607)"}>
        {variant === "dark" && <MarkGradient id={gid} />}
        <path d={MARK_D} fill={fill} />
      </g>
    </svg>
  );
}

/** Social avatar (kit Social/riadha-social-avatar): navy, gradient mark, safe for circular crops. */
export function SocialAvatar({ size = 48, className }: { size?: number; className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 1080 1080" width={size} height={size} className={cn("shrink-0 rounded-full", className)} aria-hidden>
      <rect width="1080" height="1080" fill={C.navy} />
      <g transform="translate(231 310.45) scale(1.15607)">
        <MarkGradient id={gid} />
        <path d={MARK_D} fill={`url(#${gid})`} />
      </g>
    </svg>
  );
}

/**
 * "SPORT • TALENT • SCOUTING" as live text (kit typography: Sora SemiBold, +18% tracking). Use the
 * lockups when it sits with the logo; this is for labels, marquees and footers.
 */
export function Tagline({ light, className }: { light?: boolean; className?: string }) {
  const dot = <span className={light ? "text-green" : "text-green-deep"} aria-hidden>•</span>;
  return (
    <span className={cn("whitespace-nowrap font-semibold uppercase tracking-[0.18em] [word-spacing:0.3em]", light ? "text-white" : "text-navy", className)}>
      Sport {dot} Talent {dot} Scouting
    </span>
  );
}

export function Slogan({ light, className }: { light?: boolean; className?: string }) {
  return <p className={cn("font-normal", light ? "text-white/85" : "text-navy", className)}>Pick your XI. Post your run. Get scouted.</p>;
}
