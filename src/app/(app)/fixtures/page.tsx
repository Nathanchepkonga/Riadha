import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kplClubs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getCurrentGameweek, getNextGameweek } from "@/lib/fantasy/engine";
import { latestResultsGameweek, listFixtures } from "@/lib/fixtures";
import { formatDate } from "@/lib/format";
import { MatchCard } from "@/components/sport/cards";
import { ClubBadge } from "@/components/ui/brand";
import { ChipRow, EmptyState, TabBarLinks } from "@/components/ui/nav";

export const metadata: Metadata = { title: "Fixtures" };

export default async function FixturesPage({ searchParams }: PageProps<"/fixtures">) {
  await requireUser();
  const sp = await searchParams;
  const results = sp.tab === "results";
  const clubId = Number(sp.club) || undefined;
  const [next, current, lastResults, club] = await Promise.all([
    getNextGameweek(db),
    getCurrentGameweek(db),
    latestResultsGameweek(),
    clubId ? db.select().from(kplClubs).where(eq(kplClubs.id, clubId)).then((r) => r[0] ?? null) : null,
  ]);
  const defaultGw = results ? (lastResults ?? current?.id) : next?.id;
  const gw = clubId ? undefined : Number(sp.gw) || defaultGw;
  const rows = await listFixtures({ gameweekId: gw, clubId, results });

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab: results ? "results" : undefined, club: clubId ? String(clubId) : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/fixtures${p.size ? `?${p}` : ""}`;
  };

  // Group by kickoff day, as in the kit ("Friday – February 25").
  const days = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = formatDate(r.fixture.kickoff, { weekday: "long", day: "numeric", month: "long" });
    days.set(key, [...(days.get(key) ?? []), r]);
  }

  const gwChoices = results
    ? Array.from({ length: current?.id ?? 0 }, (_, i) => (current?.id ?? 0) - i)
    : Array.from({ length: 6 }, (_, i) => (next?.id ?? 1) + i);

  return (
    <div className="px-4 pt-4">
      <h1 className="h2">Fixtures</h1>
      <TabBarLinks
        className="mt-3"
        label="Fixtures view"
        items={[
          { href: qs({ tab: undefined, gw: undefined }), label: "Upcoming", active: !results },
          { href: qs({ tab: "results", gw: undefined }), label: "Results", active: results },
        ]}
      />

      {club ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-line">
          <span className="flex items-center gap-2.5 font-semibold">
            <ClubBadge short={club.shortName} primary={club.primaryColor} secondary={club.secondaryColor} size={32} />
            {club.name}
          </span>
          <Link href={results ? "/fixtures?tab=results" : "/fixtures"} className="text-[13px] font-semibold text-cobalt hover:underline">All clubs</Link>
        </div>
      ) : (
        gwChoices.length > 0 && (
          <ChipRow
            className="mt-4"
            label="Gameweek"
            items={gwChoices.map((n) => ({ href: qs({ gw: String(n) }), label: `GW${n}`, active: n === gw }))}
          />
        )
      )}

      <div className="mt-5 flex flex-col gap-6">
        {rows.length === 0 && <EmptyState title={results ? "No results yet" : "No fixtures"} body="Check another gameweek." />}
        {[...days].map(([day, list]) => (
          <section key={day}>
            <h2 className="kicker mb-2.5">{day}</h2>
            <div className="flex flex-col gap-3">
              {list.map(({ fixture: f, home, away }) => (
                <MatchCard
                  key={f.id}
                  href={`/fixtures/${f.id}`}
                  home={home}
                  away={away}
                  kickoff={f.kickoff}
                  homeScore={f.homeScore}
                  awayScore={f.awayScore}
                  finished={f.finished}
                  footer={
                    <>
                      <b className="font-semibold">Gameweek {f.gameweekId}</b>
                      <span className="text-white/60"> · Kenyan Premier League</span>
                    </>
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link href="/fantasy/table" className="btn btn-secondary btn-block mt-8">KPL table</Link>
    </div>
  );
}
