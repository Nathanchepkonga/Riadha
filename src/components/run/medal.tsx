import { cn } from "@/lib/format";

const TAN = Math.tan((37.57 * Math.PI) / 180);

const ACCENTS: Record<string, { fill: string; inner: string; text: string; edge: string }> = {
  green: { fill: "#B7F34A", inner: "#081018", text: "#081018", edge: "#081018" },
  cobalt: { fill: "#3867FF", inner: "#081018", text: "#FFFFFF", edge: "#B7F34A" },
  navy: { fill: "#081018", inner: "#111C28", text: "#FFFFFF", edge: "#B7F34A" },
  locked: { fill: "#E5E7EB", inner: "#F3F4F6", text: "#9CA3AF", edge: "#9CA3AF" },
};

/** "5K", "12K", "100K", "1.5K" from metres. */
export function medalLabel(goalM: number) {
  const k = goalM / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}

/**
 * A finisher's medal: a shard leaning forward on the brand diagonal, with the distance on it.
 * `locked` draws the greyed-out version for challenges not finished yet.
 */
export function Medal({ goalM, accent = "green", locked, size = 96, className, year }: { goalM: number; accent?: string; locked?: boolean; size?: number; className?: string; year?: number | string }) {
  const c = ACCENTS[locked ? "locked" : accent] ?? ACCENTS.green;
  const H = 120;
  const s = H * TAN;
  const W = 120 + s;
  const outer = `${s},0 ${W},0 ${W - s},${H} 0,${H}`;
  const inset = 9;
  const inner = `${s + inset * 1.6},${inset} ${W - inset},${inset} ${W - s - inset * 1.6},${H - inset} ${inset},${H - inset}`;
  const label = medalLabel(goalM);
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} width={size * (W / H)} height={size} className={cn("shrink-0", className)} role="img" aria-label={`${label} medal${locked ? " (not earned yet)" : ""}`}>
      <polygon points={outer} fill={c.fill} stroke={c.edge} strokeWidth={3} strokeLinejoin="round" />
      <polygon points={inner} fill="none" stroke={c.inner} strokeOpacity={locked ? 0.6 : 0.35} strokeWidth={2} strokeLinejoin="round" />
      <text x={W / 2} y={H / 2 + (year ? 4 : 14)} textAnchor="middle" fontFamily="var(--font-sora), Sora, sans-serif" fontWeight={800} fontSize={label.length > 4 ? 40 : 50} letterSpacing={-2} fill={c.text}>
        {label}
      </text>
      {year && (
        <text x={W / 2} y={H / 2 + 30} textAnchor="middle" fontFamily="var(--font-sora), Sora, sans-serif" fontWeight={700} fontSize={14} letterSpacing={3} fill={c.text} opacity={0.7}>
          {year}
        </text>
      )}
    </svg>
  );
}
