import { Mountain, ShieldAlert } from "lucide-react";
import type { RouteArt as Art, Splits } from "@/db/schema";
import { cn, formatDate } from "@/lib/format";
import { SPORT_LABEL, duration, km, pace, paceOrSpeed } from "@/lib/running/format";
import { RouteArt } from "./route-art";

export type PosterActivity = {
  sport: string;
  title: string;
  startedAt: Date | string;
  distanceM: number;
  movingS: number;
  elevationGainM: number;
  splits: Splits;
  routeArt: Art | null;
  flag?: string | null;
};

export const FLAG_LABEL: Record<string, string> = {
  vehicle: "Too fast for a run: not counted",
  gps: "GPS trouble: not counted",
  impossible: "Faster than a world record: not counted",
};

/** Navy speed backdrop behind run cards (brand diagonal, leaning forward). */
function Backdrop({ accent = "#3867FF" }: { accent?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      <div className="absolute -right-16 top-0 h-[150%] w-28 origin-top -skew-x-[37.57deg] opacity-25" style={{ background: accent }} />
      <div className="absolute right-20 top-0 h-[150%] w-5 origin-top -skew-x-[37.57deg] opacity-15" style={{ background: accent }} />
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_45%,rgba(183,243,74,.10),transparent_70%)]" />
    </div>
  );
}

/** Kilometre splits as slanted bars: longer = faster; the fastest is green. */
export function SplitStrip({ splits, className }: { splits: Splits; className?: string }) {
  const km = splits.km.slice(0, 42);
  if (!km.length) return null;
  const fastest = Math.min(...km);
  const slowest = Math.max(...km);
  return (
    <div className={cn("flex h-16 items-end gap-[3px]", className)} aria-hidden>
      {km.map((s, i) => {
        const h = slowest === fastest ? 70 : 35 + (65 * (slowest - s)) / (slowest - fastest);
        return <span key={i} className={cn("w-full max-w-4 -skew-x-[37.57deg] rounded-[2px]", s === fastest ? "bg-green" : "bg-white/25")} style={{ height: `${h}%` }} />;
      })}
    </div>
  );
}

/** The run poster: the feed card (fills its parent) or the hero at the top of an activity page. */
export function RunPoster({ a, variant = "feed", draw }: { a: PosterActivity; variant?: "feed" | "hero"; draw?: boolean }) {
  const ps = paceOrSpeed(a.sport, a.distanceM, a.movingS);
  const label = `${SPORT_LABEL[a.sport as keyof typeof SPORT_LABEL] ?? "Run"} · ${formatDate(a.startedAt, { weekday: "short", day: "numeric", month: "short" })}`;
  if (variant === "hero") {
    return (
      <div className="relative isolate overflow-hidden rounded-[28px] text-white">
        <Backdrop />
        <div className="relative p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green">{label}</p>
          <h1 className="mt-1.5 text-[clamp(26px,7.5vw,34px)] font-bold leading-[1.05] tracking-[-0.035em]">{a.title}</h1>
          {a.flag && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1 text-[12px] font-semibold text-warning">
              <ShieldAlert size={14} /> {FLAG_LABEL[a.flag] ?? "Not counted"}
            </p>
          )}
          {a.routeArt ? (
            <RouteArt art={a.routeArt} draw={draw} className="mx-auto mt-4 h-[min(52vw,260px)] w-full" />
          ) : (
            <SplitStrip splits={a.splits} className="mt-6 h-24" />
          )}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 pt-4">
            <Stat label="Distance" value={km(a.distanceM)} unit="km" big />
            <Stat label={ps.label} value={ps.value} unit={ps.unit} big />
            <Stat label="Moving time" value={duration(a.movingS)} />
            <Stat label="Elevation" value={String(a.elevationGainM)} unit="m" />
          </dl>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      <Backdrop />
      <div className="absolute inset-x-5 top-5 text-white">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-green">
          {label}
          {a.flag && <ShieldAlert size={13} className="text-warning" aria-label={FLAG_LABEL[a.flag]} />}
        </p>
        <p className="mt-1 line-clamp-2 text-[22px] font-bold leading-[1.08] tracking-[-0.025em]">{a.title}</p>
        <div className="mt-3 flex items-end gap-5">
          <p className="leading-none">
            <span className="text-[44px] font-bold tracking-[-0.05em] tabular">{km(a.distanceM)}</span>
            <span className="ml-1 text-[14px] font-semibold text-white/60">km</span>
          </p>
          <dl className="flex gap-4 pb-1 text-[13px]">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{ps.label}</dt>
              <dd className="font-semibold tabular">
                {ps.value}
                <span className="text-white/50">{ps.unit === "/km" ? "/km" : ` ${ps.unit}`}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Time</dt>
              <dd className="font-semibold tabular">{duration(a.movingS)}</dd>
            </div>
            {a.elevationGainM > 0 && (
              <div>
                <dt className="sr-only">Elevation</dt>
                <dd className="flex items-center gap-1 pt-[14px] font-semibold tabular text-white/80">
                  <Mountain size={12} /> {a.elevationGainM}m
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      {a.routeArt ? (
        <RouteArt art={a.routeArt} draw={draw} className="absolute inset-x-[12%] bottom-[24%] top-[40%] h-auto w-auto" />
      ) : (
        <SplitStrip splits={a.splits} className="absolute inset-x-5 bottom-[30%] h-24" />
      )}
    </div>
  );
}

function Stat({ label, value, unit, big }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{label}</dt>
      <dd className={cn("mt-0.5 font-bold leading-none tracking-[-0.04em] tabular", big ? "text-[34px]" : "text-[22px]")}>
        {value}
        {unit && <span className="ml-1 text-[13px] font-semibold tracking-normal text-white/55">{unit}</span>}
      </dd>
    </div>
  );
}

/** Small run tile (profile gallery, highlight card): the shape and the distance. */
export function RunThumb({ a, large }: { a: PosterActivity; large?: boolean }) {
  return (
    <div className="absolute inset-0">
      <Backdrop />
      {a.routeArt ? <RouteArt art={a.routeArt} width={large ? 16 : 26} className="absolute inset-[14%] h-auto w-auto" /> : <SplitStrip splits={a.splits} className="absolute inset-x-3 bottom-1/3 h-1/4" />}
      <p className="absolute bottom-2 left-3 font-bold leading-none tracking-[-0.04em] text-white tabular" style={{ fontSize: large ? 34 : 18 }}>
        {km(a.distanceM)}
        <span className="ml-1 text-[0.45em] font-semibold text-white/60">km</span>
      </p>
    </div>
  );
}

/** Split table for the activity page: pace per kilometre with a slanted bar (fastest in green). */
export function SplitsTable({ splits, sport }: { splits: Splits; sport: string }) {
  const rows = splits.km.map((s, i) => ({ label: String(i + 1), s, perKm: s }));
  if (splits.rest) rows.push({ label: (splits.rest[0] / 1000).toFixed(2).replace(/^0/, ""), s: splits.rest[1], perKm: (splits.rest[1] / splits.rest[0]) * 1000 });
  if (!rows.length) return null;
  const fastest = Math.min(...rows.map((r) => r.perKm));
  const slowest = Math.max(...rows.map((r) => r.perKm));
  return (
    <table className="w-full text-[14px]">
      <thead>
        <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <th className="w-12 py-2">Km</th>
          <th className="w-20 py-2">{sport === "ride" ? "Speed" : "Pace"}</th>
          <th className="py-2"><span className="sr-only">Bar</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const w = slowest === fastest ? 80 : 30 + (70 * (slowest - r.perKm)) / (slowest - fastest);
          return (
            <tr key={r.label} className="border-t border-line/70">
              <td className="py-2 font-semibold tabular">{r.label}</td>
              <td className="py-2 tabular">{sport === "ride" ? `${(3600 / r.perKm).toFixed(1)}` : pace(r.perKm)}</td>
              <td className="py-2">
                <span className={cn("block h-3 -skew-x-[37.57deg] rounded-[3px]", r.perKm === fastest ? "bg-green" : "bg-navy/80")} style={{ width: `${w}%` }} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Elevation profile as a small area chart. */
export function ElevationChart({ ele }: { ele: number[] }) {
  if (ele.length < 2) return null;
  const lo = Math.min(...ele);
  const hi = Math.max(...ele);
  const span = Math.max(hi - lo, 10);
  const pts = ele.map((e, i) => `${(i / (ele.length - 1)) * 300},${90 - ((e - lo) / span) * 80}`);
  return (
    <figure>
      <svg viewBox="0 0 300 100" className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
        <polygon points={`0,100 ${pts.join(" ")} 300,100`} fill="#3867FF" opacity={0.15} />
        <polyline points={pts.join(" ")} fill="none" stroke="#3867FF" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted tabular">
        <span>{lo} m</span>
        <span>{hi} m</span>
      </figcaption>
    </figure>
  );
}
