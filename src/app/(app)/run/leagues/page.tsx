import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { myCommunities } from "@/lib/communities";
import { cn, formatDate } from "@/lib/format";
import { RUN_CATEGORIES } from "@/lib/running/constants";
import { km, weekDistance } from "@/lib/running/format";
import { POINTS_RULES } from "@/lib/running/points";
import { countyCup, leagueTable, type LeagueOrder, type LeagueScope } from "@/lib/running/queries";
import { addWeeks, weekStartOf } from "@/lib/running/track";
import { Avatar } from "@/components/ui/avatar";
import { ChipRow, EmptyState, Segmented, TabBarLinks } from "@/components/ui/nav";

export const metadata: Metadata = { title: "Run League" };

export default async function LeaguesPage({ searchParams }: PageProps<"/run/leagues">) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "county" ? "county" : "league";
  const thisWeek = weekStartOf(new Date());
  const rawWeek = typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? weekStartOf(new Date(`${sp.week}T12:00:00+03:00`)) : thisWeek;
  const week = rawWeek > thisWeek ? thisWeek : rawWeek;
  const order: LeagueOrder = sp.order === "distance" ? "distance" : "points";
  const crews = (await myCommunities(user.id)).filter((c) => RUN_CATEGORIES.includes(c.community.category));
  const rawScope = typeof sp.scope === "string" ? sp.scope : "overall";
  const crew = rawScope.startsWith("crew-") ? crews.find((c) => c.community.id === Number(rawScope.slice(5))) : undefined;
  const scope: LeagueScope = crew ? "crew" : rawScope === "following" || (rawScope === "county" && user.county) ? (rawScope as LeagueScope) : "overall";
  const href = (p: Record<string, string>) => `/run/leagues?${new URLSearchParams({ tab, week, order, scope: crew ? `crew-${crew.community.id}` : scope, ...p })}`;

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <Link href="/run" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Riadha Run
      </Link>
      <div>
        <p className="kicker">Fantasy for runners</p>
        <h1 className="h2">{tab === "county" ? "County Cup" : "Run League"}</h1>
      </div>
      <TabBarLinks
        label="League sections"
        items={[
          { href: "/run/leagues", label: "Weekly league", active: tab === "league" },
          { href: "/run/leagues?tab=county", label: "County Cup", active: tab === "county" },
        ]}
      />
      {tab === "county" ? (
        <CountyCup month={typeof sp.month === "string" ? sp.month : undefined} myCounty={user.county} />
      ) : (
        <>
          <ChipRow
            label="Who to compare with"
            items={[
              { href: href({ scope: "overall" }), label: "Everyone", active: scope === "overall" },
              { href: href({ scope: "following" }), label: "Following", active: scope === "following" },
              ...(user.county ? [{ href: href({ scope: "county" }), label: user.county, active: scope === "county" }] : []),
              ...crews.map((c) => ({ href: href({ scope: `crew-${c.community.id}` }), label: c.community.name, active: crew?.community.id === c.community.id })),
            ]}
          />
          <div className="flex items-center justify-between gap-2">
            <Link href={href({ week: addWeeks(week, -1) })} aria-label="Previous week" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface">
              <ChevronLeft size={16} />
            </Link>
            <p className="text-center text-[14px] font-semibold">
              {week === thisWeek ? "This week" : `Week of ${formatDate(week, { day: "numeric", month: "short" })}`}
              <span className="block text-[12px] font-normal text-muted">
                {formatDate(week, { day: "numeric", month: "short" })} – {formatDate(new Date(new Date(`${addWeeks(week, 1)}T00:00:00+03:00`).getTime() - 1), { day: "numeric", month: "short" })}
              </span>
            </p>
            {week < thisWeek ? (
              <Link href={href({ week: addWeeks(week, 1) })} aria-label="Next week" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface">
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
          </div>
          <Segmented
            items={[
              { href: href({ order: "points" }), label: "Points", active: order === "points" },
              { href: href({ order: "distance" }), label: "Distance", active: order === "distance" },
            ]}
          />
          <Table week={week} scope={scope} order={order} viewerId={user.id} county={user.county} communityId={crew?.community.id} />
          <details className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
              <Info size={16} /> How points work
            </summary>
            <ul className="divide-y divide-line/70 border-t border-line">
              {POINTS_RULES.map((r) => (
                <li key={r.label} className="flex justify-between px-4 py-2.5 text-[14px]">
                  <span>{r.label}</span>
                  <span className="font-semibold tabular">{r.value}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-[12px] text-muted">
              Weeks run Monday to Sunday, Nairobi time. Runs that fail the honesty checks (too fast, GPS jumps) don&apos;t count. Your crew&apos;s chat gets the podium every Monday.
            </p>
          </details>
        </>
      )}
    </div>
  );
}

async function Table({ week, scope, order, viewerId, county, communityId }: { week: string; scope: LeagueScope; order: LeagueOrder; viewerId: string; county: string | null; communityId?: number }) {
  const t = await leagueTable({ weekStart: week, scope, order, viewerId, county, communityId, limit: 100 });
  if (!t.rows.length) return <EmptyState title="No runs yet" body="Nobody here has run this week. Lace up and take the top spot." action={<Link href="/run/record" className="btn btn-accent">Record a run</Link>} />;
  const row = (r: (typeof t.rows)[number]) => (
    <li key={r.user.id} className={cn("flex items-center gap-3 px-4 py-2.5", r.user.id === viewerId && "bg-green/25")}>
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold tabular", r.rank <= 3 ? "bg-navy text-white" : "text-muted")}>{r.rank}</span>
      <Avatar name={r.user.displayName} url={r.user.avatarUrl} size={34} />
      <Link href={`/u/${r.user.handle}`} className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{r.user.id === viewerId ? "You" : r.user.displayName}</span>
        <span className="block truncate text-[12px] text-muted">
          {r.w.activities} activit{r.w.activities === 1 ? "y" : "ies"} · {r.w.activeDays} day{r.w.activeDays === 1 ? "" : "s"}
          {r.w.prs ? ` · ${r.w.prs} PR` : ""}
          {r.w.beatAverage ? " · beat avg" : ""}
        </span>
      </Link>
      <span className="text-right">
        <span className="block text-[15px] font-bold tabular">{order === "points" ? r.w.points : `${km(r.distance)} km`}</span>
        <span className="block text-[11px] text-muted tabular">{order === "points" ? weekDistance(r.w) : `${r.w.points} pts`}</span>
      </span>
    </li>
  );
  return (
    <ol className="card divide-y divide-line/70 overflow-hidden">
      {t.rows.map(row)}
      {t.meOutside && t.me && row(t.me)}
    </ol>
  );
}

async function CountyCup({ month, myCounty }: { month?: string; myCounty: string | null }) {
  const at = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-15T12:00:00+03:00`) : new Date();
  const cup = await countyCup(at);
  const ym = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" }).format(d);
  const prev = new Date(cup.start.getTime() - 86_400_000);
  const current = ym(new Date());
  const isCurrent = ym(cup.start) === current;
  const max = Math.max(...cup.rows.map((r) => r.km), 1);
  return (
    <>
      <p className="text-[14px] text-muted">Every kilometre run or walked counts for the county on your profile. The table resets on the 1st.</p>
      <div className="flex items-center justify-between">
        <Link href={`/run/leagues?tab=county&month=${ym(prev)}`} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface">
          <ChevronLeft size={16} />
        </Link>
        <p className="text-[15px] font-semibold">{formatDate(cup.start, { month: "long", year: "numeric" })}</p>
        {!isCurrent ? (
          <Link href={`/run/leagues?tab=county&month=${ym(cup.end)}`} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface">
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="h-9 w-9" />
        )}
      </div>
      {!myCounty && (
        <p className="rounded-xl bg-gray-100 px-4 py-3 text-[13px] text-muted">
          <Link href="/me/edit" className="font-semibold text-cobalt">Add your county</Link> to run for it.
        </p>
      )}
      <ol className="card divide-y divide-line/70 overflow-hidden">
        {cup.rows.map((r) => (
          <li key={r.county} className={cn("relative px-4 py-2.5", r.county === myCounty && "bg-green/25")}>
            <span aria-hidden className="absolute inset-y-1.5 left-0 -skew-x-[37.57deg] rounded-r bg-cobalt/10" style={{ width: `${(r.km / max) * 100}%` }} />
            <span className="relative flex items-center gap-3">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold tabular", r.rank && r.rank <= 3 ? "bg-navy text-white" : "text-muted")}>
                {r.rank && r.rank <= 3 ? <Trophy size={13} /> : (r.rank ?? "–")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{r.county}</span>
              <span className="text-[12px] text-muted tabular">{r.runners} runner{r.runners === 1 ? "" : "s"}</span>
              <span className="w-20 text-right text-[14px] font-bold tabular">{r.km} km</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
