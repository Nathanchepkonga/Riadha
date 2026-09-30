import Link from "next/link";
import { Play } from "lucide-react";
import { ClubBadge } from "@/components/ui/brand";
import { LiveTag, Tag } from "@/components/ui/nav";
import { cn, formatTime } from "@/lib/format";

/* Card patterns borrowed from the UI kit screens, drawn in the Riadha brand. */

export type Club = { name: string; shortName: string; primaryColor: string; secondaryColor: string };

/** Brand-coloured stand-in when a post has no photo: navy with green/cobalt slashes. */
export function StatBackdrop({ seed = 0, className }: { seed?: number; className?: string }) {
  const accent = seed % 2 === 0 ? "#B7F34A" : "#3867FF";
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-navy", className)} aria-hidden>
      <div className="absolute -right-10 top-0 h-[140%] w-24 origin-top -skew-x-[28deg]" style={{ background: accent, opacity: 0.9 }} />
      <div className="absolute right-16 top-0 h-[140%] w-6 origin-top -skew-x-[28deg]" style={{ background: accent, opacity: 0.35 }} />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_10%,rgba(56,103,255,.28),transparent_60%)]" />
    </div>
  );
}

/** Hero news slide (the kit's "Top news" carousel card). */
export function NewsSlide({
  href,
  image,
  video,
  tag,
  title,
  meta,
  seed,
  stat,
}: {
  href: string;
  image?: string | null;
  video?: boolean;
  tag?: string;
  title: string;
  meta: React.ReactNode;
  seed?: number;
  stat?: { label: string; value: string } | null;
}) {
  return (
    <Link href={href} className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-navy text-white">
      {image ? (
        video ? (
          <video src={`${image}#t=0.5`} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <StatBackdrop seed={seed} />
      )}
      {!image && stat && (
        <div className="absolute left-4 top-4">
          <p className="kicker text-white/70">{stat.label}</p>
          <p className={cn("mt-1 font-bold leading-[0.9] tracking-[-0.04em]", stat.value.length > 7 ? "text-[40px]" : "text-[60px]")}>{stat.value}</p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy via-navy/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        {tag && <Tag tone="green">{tag}</Tag>}
        <p className="mt-2 line-clamp-2 text-[18px] font-bold leading-tight tracking-[-0.01em]">{title}</p>
        <p className="mt-1.5 text-[12px] text-white/70">{meta}</p>
      </div>
      {video && (
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-green text-navy">
          <Play size={15} fill="currentColor" />
        </span>
      )}
    </Link>
  );
}

/** Horizontal highlight card: thumbnail with play button + tag, title and two-line summary. */
export function HighlightCard({ href, image, video, tag = "Highlights", title, body, seed = 0 }: { href: string; image?: string | null; video?: boolean; tag?: string; title: string; body: string; seed?: number }) {
  return (
    <Link href={href} className="card flex w-[300px] shrink-0 gap-3 overflow-hidden p-2 transition-colors hover:border-gray-400">
      <span className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-navy">
        {image && !video ? (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : image && video ? (
          <video src={`${image}#t=0.5`} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <StatBackdrop seed={seed} />
        )}
        <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-green text-navy shadow-lg">
          <Play size={14} fill="currentColor" />
        </span>
      </span>
      <span className="min-w-0 py-1 pr-1">
        <Tag tone="gray">{tag}</Tag>
        <span className="mt-1.5 line-clamp-1 block text-[14px] font-bold">{title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">{body}</span>
      </span>
    </Link>
  );
}

/** League / club tile (the kit's "All leagues" row). */
export function LeagueTile({ href, badge, name, sub }: { href: string; badge: React.ReactNode; name: string; sub?: string }) {
  return (
    <Link href={href} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
      <span className="card grid h-16 w-16 place-items-center transition-colors hover:border-gray-400">{badge}</span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight">{name}</span>
      {sub && <span className="text-[10px] text-muted">{sub}</span>}
    </Link>
  );
}

/** Match card (the kit's fixtures list): kickoff chip, crest v crest, navy footer bar. */
export function MatchCard({
  href,
  home,
  away,
  kickoff,
  homeScore,
  awayScore,
  finished,
  live,
  footer,
}: {
  href?: string;
  home: Club;
  away: Club;
  kickoff: Date;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
  live?: boolean;
  footer: React.ReactNode;
}) {
  const played = homeScore !== null && awayScore !== null;
  const body = (
    <>
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="kicker">KPL</span>
        {live ? <LiveTag /> : finished ? <Tag tone="gray">Full time</Tag> : <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-semibold tabular">{formatTime(kickoff)}</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-4 pt-2">
        {[home, away].map((c, i) => (
          <span key={c.shortName} className={cn("flex min-w-0 flex-col items-center gap-1.5 text-center", i === 1 && "col-start-3")}>
            <ClubBadge short={c.shortName} primary={c.primaryColor} secondary={c.secondaryColor} size={40} />
            <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{c.name}</span>
          </span>
        ))}
        <span className={cn("col-start-2 row-start-1 rounded-lg px-2.5 py-1 text-center text-[20px] font-bold tabular", played ? "bg-navy text-white" : "text-muted")}>
          {played ? `${homeScore} – ${awayScore}` : "vs"}
        </span>
      </div>
      <div className="relative overflow-hidden bg-navy px-4 py-2.5 text-[12px] text-white">
        <span className="absolute -right-3 top-0 h-full w-10 -skew-x-[28deg] bg-green" aria-hidden />
        <span className="relative">{footer}</span>
      </div>
    </>
  );
  const cls = "card block overflow-hidden transition-colors hover:border-gray-400";
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Match centre header (the kit's score screen): crests, big score, status. */
export function ScoreHeader({ home, away, homeScore, awayScore, status, sub }: { home: Club; away: Club; homeScore: number | null; awayScore: number | null; status: React.ReactNode; sub?: React.ReactNode }) {
  const played = homeScore !== null && awayScore !== null;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy px-4 pb-5 pt-5 text-white">
      <span className="absolute -left-8 bottom-0 h-24 w-14 -skew-x-[28deg] bg-green/90" aria-hidden />
      <span className="absolute -left-1 bottom-0 h-16 w-4 -skew-x-[28deg] bg-cobalt" aria-hidden />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <span className="flex flex-col items-center gap-2">
          <ClubBadge short={home.shortName} primary={home.primaryColor} secondary={home.secondaryColor} size={56} />
          <span className="text-[13px] font-semibold leading-tight">{home.name}</span>
        </span>
        <span>
          <span className="block text-[40px] font-bold leading-none tracking-[-0.04em] tabular">{played ? `${homeScore} – ${awayScore}` : "vs"}</span>
          <span className="mt-2 inline-block text-[12px] text-white/70">{status}</span>
        </span>
        <span className="flex flex-col items-center gap-2">
          <ClubBadge short={away.shortName} primary={away.primaryColor} secondary={away.secondaryColor} size={56} />
          <span className="text-[13px] font-semibold leading-tight">{away.name}</span>
        </span>
      </div>
      {sub && <div className="relative mt-4 text-center text-[12px] text-white/60">{sub}</div>}
    </div>
  );
}

/** Stats table (the kit's Summary / MIN / PTS / REB / AST grid). */
export function StatsTable<T>({ columns, rows, rowKey, caption }: { columns: { key: string; label: string; align?: "left" | "right"; render: (r: T) => React.ReactNode; strong?: boolean }[]; rows: T[]; rowKey: (r: T) => string | number; caption?: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[340px] text-[13px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2.5", c.align === "right" && "text-right")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-line/70 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2.5", c.align === "right" && "text-right tabular", c.strong && "font-bold")}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
