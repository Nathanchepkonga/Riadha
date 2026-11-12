import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarDays, ChevronRight, FileUp, MapPinOff, Play, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { cn, formatDate, formatKickoff } from "@/lib/format";
import { km, weekDistance } from "@/lib/running/format";
import { countyCup, dailyKm, leagueTable, listChallenges, myWeek, pendingTrialCount, recentActivities, upcomingGroupRuns } from "@/lib/running/queries";
import { weekStartOf } from "@/lib/running/track";
import { PageHero } from "@/components/ui/page-hero";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ListRow, SectionHeader } from "@/components/ui/nav";
import { CountUp } from "@/components/motion/count-up";
import { ActivityRow } from "@/components/run/activity-row";
import { ChallengeCard } from "@/components/run/challenge-card";
import { RunOutbox } from "@/components/run/outbox";

export const metadata: Metadata = { title: "Riadha Run" };

/** The last seven days (Nairobi), oldest first, with the kilometres done on each. */
function lastSevenDays(days: Map<string, number>) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(d);
    return { key, label: formatDate(d, { weekday: "narrow" }), m: days.get(key) ?? 0 };
  });
}

export default async function RunHub() {
  const user = await requireUser();
  const week = weekStartOf(new Date());
  const club = user.role === "club" && user.verified;
  const [mine, days, challenges, table, cup, groupRuns, recent, toReview] = await Promise.all([
    myWeek(user.id, week),
    dailyKm(user.id, 7),
    listChallenges(user.id),
    leagueTable({ weekStart: week, scope: "overall", order: "points", viewerId: user.id, limit: 5 }),
    countyCup(),
    upcomingGroupRuns(user.id),
    recentActivities(user.id, { own: true, limit: 5 }),
    club ? pendingTrialCount(user.id) : 0,
  ]);
  const open = challenges.filter((c) => c.state !== "ended").sort((a, b) => Number(!!b.entry) - Number(!!a.entry));
  const strip = lastSevenDays(days);
  const peak = Math.max(...strip.map((s) => s.m), 1000);
  const myCounty = user.county ? cup.rows.find((r) => r.county === user.county) : null;
  const w = mine.w;

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      <PageHero kicker="Riadha Run" title="Every run *counts.*" body="Record or upload your runs. Each one becomes a post, scores Run League points and moves you through your challenges.">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/run/record" className="btn btn-accent">
            <Play size={16} fill="currentColor" /> Record
          </Link>
          <Link href="/run/upload" className="btn btn-light">
            <FileUp size={16} /> Upload
          </Link>
        </div>
      </PageHero>

      <RunOutbox />

      <section className="relative overflow-hidden rounded-[24px] bg-navy p-4 text-white" data-reveal="up" suppressHydrationWarning>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker text-white/55">This week</p>
            <p className="mt-1 text-[44px] font-bold leading-none tracking-[-0.05em] tabular">
              <CountUp to={w?.points ?? 0} duration={1200} />
              <span className="ml-1.5 text-[15px] font-semibold tracking-normal text-white/55">pts</span>
            </p>
          </div>
          <Link href="/run/leagues" className="rounded-2xl bg-white/10 px-3 py-2 text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Run League</span>
            <span className="block text-[20px] font-bold tabular">{mine.rank ? `#${mine.rank}` : "–"}</span>
            <span className="block text-[11px] text-white/55">of {mine.runners}</span>
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["km", km((w?.runM ?? 0) + (w?.walkM ?? 0) + (w?.rideM ?? 0))],
            ["activities", String(w?.activities ?? 0)],
            ["active days", String(w?.activeDays ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/[.06] py-2">
              <dd className="text-[20px] font-bold tabular">{value}</dd>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex h-16 items-end gap-2" aria-label="Kilometres per day, last 7 days">
          {strip.map((s) => (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
              <span className={cn("w-full max-w-6 -skew-x-[37.57deg] rounded-[3px]", s.m ? "bg-green" : "bg-white/10")} style={{ height: `${s.m ? 12 + (s.m / peak) * 36 : 6}px` }} title={`${km(s.m)} km`} />
              <span className="text-[10px] font-semibold text-white/45">{s.label}</span>
            </div>
          ))}
        </div>
        {w && (w.prs > 0 || w.groupRuns > 0 || w.beatAverage) && (
          <p className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {w.beatAverage && <span className="rounded-full bg-green px-2 py-0.5 text-navy">Beat your average +10</span>}
            {w.prs > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5">{w.prs} PR{w.prs === 1 ? "" : "s"}</span>}
            {w.groupRuns > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5">{w.groupRuns} group run{w.groupRuns === 1 ? "" : "s"}</span>}
          </p>
        )}
      </section>

      {open.length > 0 && (
        <section>
          <SectionHeader title="Challenges" href="/challenges" action="All challenges" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1" data-stagger="60">
            {open.slice(0, 8).map((r) => (
              <div key={r.c.id} data-reveal="right" suppressHydrationWarning className="shrink-0">
                <ChallengeCard c={r.c} entry={r.entry} participants={r.participants} sponsor={r.sponsor} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Run League" href="/run/leagues" action="Tables" />
        <p className="mt-1 text-[12px] text-muted">Points for distance, active days, beating your average, PRs and group runs. Resets every Monday.</p>
        {table.rows.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-center text-[14px] text-muted">No runs yet this week. Be first on the table.</p>
        ) : (
          <ol className="card mt-3 divide-y divide-line/70 overflow-hidden">
            {table.rows.map((r) => (
              <li key={r.user.id} className={cn("flex items-center gap-3 px-4 py-2.5", r.user.id === user.id && "bg-green/25")}>
                <span className="w-5 text-[14px] font-bold tabular">{r.rank}</span>
                <Avatar name={r.user.displayName} url={r.user.avatarUrl} size={30} />
                <Link href={`/u/${r.user.handle}`} className="min-w-0 flex-1 truncate text-[14px] font-semibold">{r.user.displayName}</Link>
                <span className="text-[12px] text-muted tabular">{weekDistance(r.w)}</span>
                <span className="w-14 text-right text-[14px] font-bold tabular">{r.w.points}</span>
              </li>
            ))}
            {table.meOutside && table.me && (
              <li className="flex items-center gap-3 bg-green/25 px-4 py-2.5">
                <span className="w-5 text-[14px] font-bold tabular">{table.me.rank}</span>
                <Avatar name={user.displayName} url={user.avatarUrl} size={30} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">You</span>
                <span className="w-14 text-right text-[14px] font-bold tabular">{table.me.w.points}</span>
              </li>
            )}
          </ol>
        )}
      </section>

      <Link href="/run/leagues?tab=county" className="pressable relative block overflow-hidden rounded-[24px] bg-cobalt p-4 text-white" data-reveal="up" suppressHydrationWarning>
        <span aria-hidden className="absolute -right-6 top-0 h-full w-16 -skew-x-[37.57deg] bg-white/15" />
        <p className="kicker flex items-center gap-1.5 text-white/75"><Trophy size={13} /> County Cup · {formatDate(cup.start, { month: "long" })}</p>
        <ol className="relative mt-2 flex flex-col gap-1 text-[15px]">
          {cup.rows.slice(0, 3).map((r) => (
            <li key={r.county} className="flex justify-between">
              <span className="font-semibold">{r.rank ? `${r.rank}. ` : ""}{r.county}</span>
              <span className="tabular">{r.km} km</span>
            </li>
          ))}
        </ol>
        <p className="relative mt-2 text-[12px] text-white/80">
          {myCounty ? `${myCounty.county}: ${myCounty.rank ? `#${myCounty.rank}` : "no km yet"} · every km you run counts for your county` : "Add your county to your profile to play for it"}
          <ChevronRight size={14} className="ml-0.5 inline" />
        </p>
      </Link>

      {groupRuns.length > 0 && (
        <section>
          <SectionHeader title="Group runs" />
          <ul className="mt-3 flex flex-col gap-2">
            {groupRuns.map(({ event: e, community }) => (
              <li key={e.id}>
                <Link href={`/c/${community.slug}/events/${e.id}`} className="card pressable flex items-center gap-3 p-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-green"><CalendarDays size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.title}</span>
                    <span className="block truncate text-[12px] text-muted">{community.name} · {formatKickoff(e.startsAt)}</span>
                  </span>
                  <ChevronRight size={16} className="text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">Record or upload your run from the meeting point and it joins the group results by itself (+3 points).</p>
        </section>
      )}

      <section>
        <SectionHeader title="Your activities" />
        {recent.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No runs yet" body="Record your first run, or upload one from your watch." action={<Link href="/run/record" className="btn btn-accent">Record a run</Link>} />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2" data-stagger="50">
            {recent.map((a) => (
              <div key={a.id} data-reveal="up" suppressHydrationWarning>
                <ActivityRow a={a} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="card divide-y divide-line/70 overflow-hidden">
        <ListRow href="/run/trials" icon={<BadgeCheck size={18} />} label="Verified times" hint="For scouts" />
        {club && <ListRow href="/run/trials/review" icon={<BadgeCheck size={18} />} label="Times to confirm" hint={toReview ? `${toReview} waiting` : undefined} />}
        <ListRow href="/run/privacy" icon={<MapPinOff size={18} />} label="Route privacy" hint="Hide places" />
      </div>
    </div>
  );
}
