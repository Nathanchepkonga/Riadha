import { cn } from "@/lib/format";

/*
 * Riadha logo system, rebuilt from the designer's board (design/brand/02–11, 14, 18).
 * The monogram paths were traced from 05_Icon_Monogram.png and cleaned up; viewBox is 100×80.
 * Wordmark and tagline are set in Montserrat Bold, as in the Canva file.
 */

export const MARK_PATHS = [
  "M25 0H66.6C68.6 0 69.6 1.6 68.5 3.1L52.8 22C52.1 22.7 51.3 23 50.3 23H34C28.6 23 24.4 27.3 24.4 32.8V56.4C24.4 56.8 24.2 57.2 23.9 57.5L4.4 78.6C2.9 80.2.2 79.8.1 77.4L0 26.5C0 21 2.6 16.4 7.2 12L15.2 4.3C18 1.6 21.4 0 25 0Z",
  "M83.2.4H96.4C99.4.4 100.9 3.8 99 6.3L57.6 62.4C56.6 64 55.1 64.9 53.4 64.9H34C32.1 64.9 31.2 63.3 32.3 62L80.3 2.3C81 1 82 .4 83.2.4Z",
];

const TONE = { green: "#B7F34A", navy: "#081018", white: "#FFFFFF" } as const;
type Tone = keyof typeof TONE;

export function LogoMark({ tone = "green", className, title }: { tone?: Tone; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={cn("h-auto shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {MARK_PATHS.map((d) => (
        <path key={d.slice(0, 12)} d={d} fill={TONE[tone]} />
      ))}
    </svg>
  );
}

export function Wordmark({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("font-brand font-bold lowercase leading-none tracking-[-0.035em]", light ? "text-white" : "text-navy", className)}>
      riadha
    </span>
  );
}

/** "SPORT • TALENT • SCOUTING" with electric-green separators. */
export function Tagline({ light, fit, className }: { light?: boolean; fit?: boolean; className?: string }) {
  // `fit` justifies the line to its container (the primary lockup matches the wordmark's width);
  // the dots sit between real spaces so justification has somewhere to put the slack.
  const dot = <span className="text-green" aria-hidden>•</span>;
  return (
    <span
      className={cn(
        "font-brand font-bold uppercase leading-none whitespace-nowrap",
        fit ? "block w-0 min-w-full tracking-[0.12em] [text-align-last:justify]" : "tracking-[0.26em] [word-spacing:0.25em]",
        light ? "text-white" : "text-navy",
        className,
      )}
    >
      Sport {dot} Talent {dot} Scouting
    </span>
  );
}

export function Slogan({ light, className }: { light?: boolean; className?: string }) {
  return (
    <p className={cn("font-brand font-medium italic", light ? "text-white/90" : "text-navy", className)}>
      Pick your XI. Post your run. Get scouted.
    </p>
  );
}

type Theme = "light" | "dark" | "mono-dark" | "mono-light";

function toneFor(theme: Theme) {
  return {
    mark: (theme === "mono-dark" ? "navy" : theme === "mono-light" ? "white" : "green") as Tone,
    light: theme === "dark" || theme === "mono-light",
  };
}

/**
 * Lockups from the board: primary (mark + wordmark, tagline under the wordmark), stacked (centred),
 * horizontal (mark + wordmark | tagline), and compact (mark + wordmark only, for app bars).
 * `size` is the wordmark font size (px, or any CSS length such as a clamp() for fluid heroes);
 * everything else scales from it in em.
 */
export function Logo({
  variant = "primary",
  theme = "light",
  size = 32,
  className,
}: {
  variant?: "primary" | "stacked" | "horizontal" | "compact";
  theme?: Theme;
  size?: number | string;
  className?: string;
}) {
  const { mark, light } = toneFor(theme);
  const word = <Wordmark light={light} className="block" />;
  const style = { fontSize: size };

  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center", className)} style={style} role="img" aria-label="Riadha: Sport, Talent, Scouting">
        <LogoMark tone={mark} className="w-[1.35em]" />
        <span className="mt-[0.18em]">{word}</span>
        <Tagline light={light} className="mt-[0.45em] text-[0.2em]" />
      </span>
    );
  }
  if (variant === "horizontal") {
    return (
      <span className={cn("inline-flex items-center", className)} style={style} role="img" aria-label="Riadha: Sport, Talent, Scouting">
        <LogoMark tone={mark} className="w-[1.2em]" />
        <span className="ml-[0.3em]">{word}</span>
        <span className={cn("mx-[0.55em] h-[1.1em] w-px", light ? "bg-white/30" : "bg-navy/25")} />
        <Tagline light={light} className="text-[0.26em]" />
      </span>
    );
  }
  if (variant === "compact") {
    return (
      <span className={cn("inline-flex items-center", className)} style={style} role="img" aria-label="Riadha">
        <LogoMark tone={mark} className="w-[1.15em]" />
        <span className="ml-[0.28em]">{word}</span>
      </span>
    );
  }
  // Primary: the tagline is justified to exactly the wordmark's width, as on the board.
  return (
    <span className={cn("inline-flex items-center", className)} style={style} role="img" aria-label="Riadha: Sport, Talent, Scouting">
      <LogoMark tone={mark} className="w-[1.4em]" />
      <span className="ml-[0.24em] inline-flex flex-col">
        {word}
        <Tagline light={light} fit className="mt-[0.4em] text-[0.15em]" />
      </span>
    </span>
  );
}

/** Favicon: navy rounded square, green mark. App icon: green rounded square, navy mark. */
export function AppIcon({ variant = "favicon", size = 48, className }: { variant?: "favicon" | "app"; size?: number; className?: string }) {
  const app = variant === "app";
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center", app ? "bg-green" : "bg-navy", className)}
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      aria-hidden
    >
      <LogoMark tone={app ? "navy" : "green"} className="w-[58%]" />
    </span>
  );
}

/** Social avatar: navy disc with a green ring. */
export function SocialAvatar({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full bg-navy", className)} style={{ width: size, height: size, boxShadow: `inset 0 0 0 ${Math.max(2, size * 0.04)}px #B7F34A` }} aria-hidden>
      <LogoMark tone="green" className="w-[52%]" />
    </span>
  );
}
