import type { RouteArt as Art } from "@/db/schema";
import { cn } from "@/lib/format";

/**
 * A route as line art: the shape only (no map, no coordinates), with the start, finish and privacy zones
 * already cut out on the server. `draw` traces it in once (off under reduced motion).
 */
export function RouteArt({ art, className, stroke = "#B7F34A", width = 14, draw, glow = true }: { art: Art; className?: string; stroke?: string; width?: number; draw?: boolean; glow?: boolean }) {
  const [w, h] = art.v;
  const pad = 60;
  const points = art.s.map((seg) => {
    const out: string[] = [];
    for (let i = 0; i < seg.length; i += 2) out.push(`${seg[i]},${seg[i + 1]}`);
    return out.join(" ");
  });
  return (
    <svg viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} className={cn("block", className)} preserveAspectRatio="xMidYMid meet" aria-hidden fill="none">
      {glow && (
        <g stroke={stroke} strokeWidth={width * 2.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.18}>
          {points.map((p, i) => (
            <polyline key={i} points={p} />
          ))}
        </g>
      )}
      <g stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
        {points.map((p, i) => (
          <polyline key={i} points={p} pathLength={1000} className={draw ? "animate-draw" : undefined} style={draw ? ({ "--len": 1000 } as React.CSSProperties) : undefined} />
        ))}
      </g>
    </svg>
  );
}
