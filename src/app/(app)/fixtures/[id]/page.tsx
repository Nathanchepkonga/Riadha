import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Goal, Handshake, Star } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getFixture } from "@/lib/fixtures";
import { formatKickoff, surname } from "@/lib/format";
import { ScoreHeader, StatsTable } from "@/components/sport/cards";
import { EmptyState, Segmented, TabBarLinks } from "@/components/ui/nav";

export const metadata: Metadata = { title: "Match centre" };

type View = "overview" | "stats" | "fantasy";

export default async function MatchCentre({ params, searchParams }: PageProps<"/fixtures/[id]">) {
  await requireUser();
  const id = Number((await params).id);
  const sp = await searchParams;
  const data = Number.isInteger(id) ? await getFixture(id) : null;
  if (!data) notFound();
  const { fixture: f, home, away, lines } = data;
  const view: View = sp.view === "stats" || sp.view === "fantasy" ? sp.view : "overview";
  const side = sp.side === "away" ? "away" : "home";
  const base = `/fixtures/${f.id}`;

  const homeLines = lines.filter((l) => l.player.clubId === f.homeClubId);
  const awayLines = lines.filter((l) => l.player.clubId === f.awayClubId);
  const events = lines
    .flatMap((l) => [
      ...Array.from({ length: l.stat.goals }, () => ({ kind: "goal" as const, name: l.player.name, home: l.player.clubId === f.homeClubId })),
      ...Array.from({ length: l.stat.assists }, () => ({ kind: "assist" as const, name: l.player.name, home: l.player.clubId === f.homeClubId })),
    ])
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "goal" ? -1 : 1));
  const status = f.finished ? "Full time" : f.homeScore !== null ? "In progress" : formatKickoff(f.kickoff);

  return (
    <div className="px-4 pt-4">
      <ScoreHeader home={home} away={away} homeScore={f.homeScore} awayScore={f.awayScore} status={status} sub={`Gameweek ${f.gameweekId} · Kenyan Premier League`} />

      <TabBarLinks
        className="mt-5"
        label="Match centre"
        items={[
          { href: base, label: "Overview", active: view === "overview" },
          { href: `${base}?view=stats`, label: "Stats", active: view === "stats" },
          { href: `${base}?view=fantasy`, label: "Fantasy", active: view === "fantasy" },
        ]}
      />

      <div className="mt-5">
        {lines.length === 0 ? (
          <EmptyState title="No stats yet" body={`Stats appear here once the match is played (${formatKickoff(f.kickoff)}).`} />
        ) : view === "overview" ? (
          <div className="card divide-y divide-line/70">
            {events.length === 0 && <p className="p-4 text-[14px] text-muted">A goalless game.</p>}
            {events.map((e, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${e.home ? "" : "flex-row-reverse text-right"}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${e.kind === "goal" ? "bg-green text-navy" : "bg-gray-100 text-ink"}`}>
                  {e.kind === "goal" ? <Goal size={16} /> : <Handshake size={16} />}
                </span>
                <span className="text-[14px]">
                  <b className="font-semibold">{e.name}</b>
                  <span className="text-muted"> · {e.kind === "goal" ? "Goal" : "Assist"}</span>
                </span>
              </div>
            ))}
          </div>
        ) : view === "stats" ? (
          <>
            <StatsTable
              caption={`${side === "home" ? home.name : away.name} player stats`}
              rows={side === "home" ? homeLines : awayLines}
              rowKey={(r) => r.player.id}
              columns={[
                { key: "p", label: "Player", render: (r) => <span className="font-semibold">{surname(r.player.name)} <span className="text-[11px] font-normal text-muted">{r.player.position}</span></span> },
                { key: "min", label: "Min", align: "right", render: (r) => r.stat.minutes },
                { key: "g", label: "G", align: "right", render: (r) => r.stat.goals },
                { key: "a", label: "A", align: "right", render: (r) => r.stat.assists },
                { key: "sv", label: "Sv", align: "right", render: (r) => r.stat.saves },
                { key: "cs", label: "CS", align: "right", render: (r) => (r.stat.cleanSheet ? "✓" : "–") },
              ]}
            />
            <Segmented
              className="sticky-above-tabbar z-20 mt-4"
              items={[
                { href: `${base}?view=stats&side=home`, label: home.name, active: side === "home" },
                { href: `${base}?view=stats&side=away`, label: away.name, active: side === "away" },
              ]}
            />
          </>
        ) : (
          <StatsTable
            caption="Fantasy points in this match"
            rows={lines.slice(0, 15)}
            rowKey={(r) => r.player.id}
            columns={[
              { key: "p", label: "Player", render: (r) => <span className="font-semibold">{r.player.name}</span> },
              { key: "b", label: "Bonus", align: "right", render: (r) => (r.stat.bonus ? <span className="inline-flex items-center gap-1"><Star size={12} className="fill-green text-navy" />{r.stat.bonus}</span> : "–") },
              { key: "pts", label: "Pts", align: "right", strong: true, render: (r) => r.stat.points },
            ]}
          />
        )}
      </div>
    </div>
  );
}
