import Link from "next/link";
import { Footprints, Lock, ShieldAlert } from "lucide-react";
import type { RouteArt as Art } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { duration, km, paceOrSpeed } from "@/lib/running/format";
import { RouteArt } from "./route-art";

type Row = { id: number; sport: string; title: string; startedAt: Date; distanceM: number; movingS: number; routeArt: Art | null; isPrivate: boolean; flag: string | null };

/** A run in a list: shape thumbnail, title, numbers. */
export function ActivityRow({ a, dark }: { a: Row; dark?: boolean }) {
  const ps = paceOrSpeed(a.sport, a.distanceM, a.movingS);
  return (
    <Link href={`/run/a/${a.id}`} className={dark ? "flex items-center gap-3 rounded-2xl bg-navy-2 p-2.5 ring-1 ring-white/10" : "card pressable flex items-center gap-3 p-2.5"}>
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy">
        {a.routeArt ? <RouteArt art={a.routeArt} width={24} glow={false} className="h-full w-full" /> : <Footprints size={22} className="text-green" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="truncate">{a.title}</span>
          {a.isPrivate && <Lock size={12} className="shrink-0 opacity-50" aria-label="Only you" />}
          {a.flag && <ShieldAlert size={13} className="shrink-0 text-warning" aria-label="Not counted" />}
        </span>
        <span className={dark ? "block text-[13px] text-white/75 tabular" : "block text-[13px] text-ink/80 tabular"}>
          {km(a.distanceM)} km · {duration(a.movingS)} · {ps.value}
          {ps.unit === "/km" ? "/km" : ` ${ps.unit}`}
        </span>
        <span className={dark ? "block text-[12px] text-white/50" : "block text-[12px] text-muted"}>{formatDate(a.startedAt, { weekday: "short", day: "numeric", month: "short" })}</span>
      </span>
    </Link>
  );
}
