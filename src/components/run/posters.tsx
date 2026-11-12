import Link from "next/link";
import { Crown, MapPin, Timer, Trophy, UsersRound } from "lucide-react";
import type { RouteArt as Art } from "@/db/schema";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/format";
import { pace, raceTime } from "@/lib/running/format";
import { Medal } from "./medal";
import { RouteArt } from "./route-art";

/* Posters for posts Riadha makes for you: weekly Run League results, group-run recaps and medals.
   Each fills a 4:5 post card (absolute inset-0) and reads its snapshot from posts.data. */

type Person = { handle: string; name: string; avatarUrl: string | null; points?: number; km: number };
export type WeekData = { week: string; runners: number; totalKm: number; top: Person[]; distance: Person | null; county: { name: string; km: number } | null };
export type GroupData = { eventId: number; title: string; startsAt: string; location: string; community: { slug: string; name: string }; runners: number; totalKm: number; fastestPace: number | null; people: Person[]; arts: Art[] };
export type MedalData = { slug: string; title: string; goalM: number; accent: string; completedAt: string; bestMs: number | null; kind: string };

function Backdrop({ accent = "#B7F34A" }: { accent?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      <div className="absolute -left-10 top-0 h-[150%] w-24 origin-top -skew-x-[37.57deg] opacity-20" style={{ background: accent }} />
      <div className="absolute left-20 top-0 h-[150%] w-4 origin-top -skew-x-[37.57deg] opacity-10" style={{ background: accent }} />
      <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_80%_20%,rgba(56,103,255,.3),transparent_70%)]" />
    </div>
  );
}

export function WeekPoster({ d }: { d: WeekData }) {
  return (
    <div className="absolute inset-0 text-white">
      <Backdrop />
      <div className="absolute inset-x-5 top-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-green">
          <Trophy size={13} /> Run League · week of {formatDate(d.week, { day: "numeric", month: "short" })}
        </p>
        <p className="mt-1 text-[24px] font-bold leading-[1.05] tracking-[-0.03em]">
          {d.runners} runners, {d.totalKm.toLocaleString("en-KE")} km
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {d.top.map((p, i) => (
            <li key={p.handle} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2", i === 0 ? "bg-green text-navy" : "bg-white/10")}>
              <span className="w-4 text-[15px] font-bold tabular">{i + 1}</span>
              <Avatar name={p.name} url={p.avatarUrl} size={30} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{p.name}</span>
              <span className="text-[14px] font-bold tabular">{p.points} pts</span>
            </li>
          ))}
        </ol>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          {d.distance && (
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <dt className="flex items-center gap-1 text-white/60"><Crown size={12} /> Most km</dt>
              <dd className="truncate font-semibold">{d.distance.name.split(" ")[0]} · {d.distance.km} km</dd>
            </div>
          )}
          {d.county && (
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <dt className="flex items-center gap-1 text-white/60"><MapPin size={12} /> County of the week</dt>
              <dd className="truncate font-semibold">{d.county.name} · {d.county.km} km</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

export function GroupRunPoster({ d }: { d: GroupData }) {
  return (
    <div className="absolute inset-0 text-white">
      <Backdrop accent="#3867FF" />
      <div className="absolute inset-x-5 top-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-green">
          <UsersRound size={13} /> Group run · {d.community.name}
        </p>
        <p className="mt-1 line-clamp-2 text-[24px] font-bold leading-[1.05] tracking-[-0.03em]">{d.title}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/75">
          <span className="font-semibold text-white">{d.runners} runner{d.runners === 1 ? "" : "s"}</span>
          <span>{d.totalKm} km together</span>
          {d.fastestPace && (
            <span className="inline-flex items-center gap-1">
              <Timer size={12} /> fastest {pace(d.fastestPace)}/km
            </span>
          )}
        </p>
      </div>
      {d.arts.length > 0 ? (
        <div className={cn("absolute inset-x-6 bottom-[26%] top-[38%] grid gap-2", d.arts.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {d.arts.map((art, i) => (
            <div key={i} className="rounded-2xl bg-white/[.06] p-1">
              <RouteArt art={art} className="h-full w-full" width={18} stroke={i % 2 ? "#FFFFFF" : "#B7F34A"} />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-x-6 top-[42%] flex flex-wrap gap-2">
          {d.people.map((p) => (
            <Avatar key={p.handle} name={p.name} url={p.avatarUrl} size={44} className="ring-2 ring-navy" />
          ))}
        </div>
      )}
    </div>
  );
}

export function MedalPoster({ d }: { d: MedalData }) {
  return (
    <div className="absolute inset-0 text-white">
      <Backdrop />
      <div className="absolute inset-x-5 top-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green">Challenge finished</p>
        <p className="mt-1 line-clamp-2 text-[24px] font-bold leading-[1.05] tracking-[-0.03em]">{d.title}</p>
        <p className="mt-1 text-[13px] text-white/65">
          {formatDate(d.completedAt, { day: "numeric", month: "long", year: "numeric" })}
          {d.bestMs ? ` · ${raceTime(d.bestMs)}` : ""}
        </p>
      </div>
      <div className="absolute inset-x-0 top-[40%] flex justify-center">
        <Medal goalM={d.goalM} accent={d.accent} size={140} year={new Date(d.completedAt).getFullYear()} className="animate-scale-in" />
      </div>
    </div>
  );
}

/** Links under a generated post (to the results, the event or the challenge). */
export function generatedLink(kind: string, data: Record<string, unknown> | null) {
  if (!data) return null;
  if (kind === "run_week") return { href: "/run/leagues", label: "See the full table" };
  if (kind === "group_run") {
    const d = data as unknown as GroupData;
    return { href: `/c/${d.community.slug}/events/${d.eventId}`, label: "Event results" };
  }
  if (kind === "medal") return { href: `/challenges/${(data as unknown as MedalData).slug}`, label: "Take the challenge" };
  return null;
}

export function GeneratedPoster({ kind, data }: { kind: string; data: Record<string, unknown> | null }) {
  if (!data) return null;
  if (kind === "run_week") return <WeekPoster d={data as unknown as WeekData} />;
  if (kind === "group_run") return <GroupRunPoster d={data as unknown as GroupData} />;
  if (kind === "medal") return <MedalPoster d={data as unknown as MedalData} />;
  return null;
}

export function GeneratedLink({ kind, data }: { kind: string; data: Record<string, unknown> | null }) {
  const l = generatedLink(kind, data);
  return l ? (
    <Link href={l.href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-green">
      {l.label} →
    </Link>
  ) : null;
}
