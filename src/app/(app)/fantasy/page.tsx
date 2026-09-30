import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Trophy, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getGameweekFixtures, getManagerHome, getPlayerPool } from "@/lib/fantasy/data";
import { SCORING_TABLE } from "@/lib/fantasy/scoring";
import { countdown, formatKickoff } from "@/lib/format";
import { CountUp } from "@/components/motion/count-up";
import { ClubBadge } from "@/components/ui/brand";
import { SectionHeader } from "@/components/ui/nav";
import { LineupEditor, type LitePlayer } from "@/components/fantasy/lineup-editor";

export const metadata: Metadata = { title: "Fantasy" };

export default async function FantasyPage({ searchParams }: PageProps<"/fantasy">) {
  const user = await requireUser();
  const sp = await searchParams;
  const home = await getManagerHome(user.id);
  const { next, current, entry } = home;

  if (!entry) {
    return (
      <div className="px-4 pt-6">
        <p className="kicker">Riadha Fantasy · KPL</p>
        <h1 className="h1 animate-fade-slide-up mt-2">
          Build your{" "}
          <span className="relative inline-block px-2">
            <span className="absolute inset-0 -skew-x-[14deg] rounded-md bg-green" aria-hidden />
            <span className="relative">XI</span>
          </span>
        </h1>
        <p className="mt-4 text-muted">
          KSh 100m budget. 15 players: 2 keepers, 5 defenders, 5 midfielders, 3 forwards. Max 3 from any club.
          {next && <> Your first deadline is <b className="text-ink">{formatKickoff(next.deadline)}</b>.</>}
        </p>
        {typeof sp.join === "string" && (
          <p className="mt-4 rounded-lg border-l-4 border-cobalt bg-cobalt/8 px-4 py-3 text-sm">
            Pick your squad first, then you&apos;ll be added to league <b>{sp.join}</b>.
          </p>
        )}
        <Link href={`/fantasy/squad${typeof sp.join === "string" ? `?join=${sp.join}` : ""}`} className="btn btn-accent btn-lg btn-block mt-6">
          Pick my squad
        </Link>
        <div className="card mt-8 overflow-hidden">
          <p className="kicker border-b border-line px-4 py-3">How points work</p>
          <table className="w-full text-sm">
            <tbody>
              {SCORING_TABLE.map(([k, v]) => (
                <tr key={k} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2 text-muted">{k}</td>
                  <td className="px-4 py-2 text-right font-semibold">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const [pool, fixtures] = await Promise.all([getPlayerPool(), next ? getGameweekFixtures(next.id) : []]);
  const ids = new Set(home.picks!.map((p) => p.playerId));
  const players: Record<number, LitePlayer> = {};
  for (const p of pool) if (ids.has(p.id)) players[p.id] = p;
  const gwPoints = home.gwRow?.points ?? 0;

  return (
    <div className="px-3 pt-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="kicker">My XI</p>
          <h1 className="truncate h3">{entry.teamName}</h1>
        </div>
        {next && (
          <span className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold text-white tabular">
            GW{next.id} · {countdown(next.deadline)}
          </span>
        )}
      </div>

      {sp.welcome && <Banner>Squad saved! Tap a player to set your captain. You&apos;re in the Riadha Launch League.</Banner>}
      {sp.transferred && <Banner>Transfers confirmed.</Banner>}

      <div className="relative mt-3 grid grid-cols-4 overflow-hidden rounded-2xl bg-navy text-white">
        {[
          { l: current ? `GW${current.id}` : "GW pts", v: gwPoints, accent: true },
          { l: "Average", v: home.gwAvg?.avg ?? 0 },
          { l: "Total", v: home.summary?.total ?? 0 },
          { l: "Rank", v: home.summary?.rank ?? 0 },
        ].map((s, i) => (
          <div key={s.l} className={s.accent ? "relative bg-green px-3 py-3 text-navy" : "px-3 py-3"}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${s.accent ? "text-navy/70" : "text-white/60"}`}>{s.l}</p>
            <p className="mt-0.5 text-[26px] font-bold leading-none tracking-[-0.03em] tabular">
              {s.l === "Rank" && !s.v ? "–" : <CountUp to={s.v} delay={i * 120} duration={1400} />}
            </p>
          </div>
        ))}
      </div>

      <nav className="mt-3 grid grid-cols-3 gap-2 text-sm font-semibold">
        <Link href={current ? `/fantasy/points/${current.id}` : "/fantasy"} className="card flex items-center justify-center gap-1.5 py-3 transition-colors hover:border-gray-400">
          <Trophy size={16} /> Points
        </Link>
        <Link href="/fantasy/squad" className="card flex items-center justify-center gap-1.5 py-3 transition-colors hover:border-gray-400">
          <ArrowLeftRight size={16} /> Transfers
        </Link>
        <Link href="/fantasy/leagues" className="card flex items-center justify-center gap-1.5 py-3 transition-colors hover:border-gray-400">
          <Users size={16} /> Leagues
        </Link>
      </nav>
      {next && home.transfer && (
        <p className="mt-2 px-1 text-xs text-muted">
          {Number.isFinite(home.transfer.free)
            ? `${home.transfer.free} free transfer${home.transfer.free === 1 ? "" : "s"} for GW${next.id}${home.transfer.made ? ` · ${home.transfer.made} made` : ""}${home.transfer.hits ? ` · −${home.transfer.hits} pts` : ""}`
            : `Unlimited transfers until your first deadline.`}
        </p>
      )}

      <div className="mt-4">
        <LineupEditor initial={home.picks!} players={players} editable={!!next} />
      </div>

      {next && fixtures.length > 0 && (
        <section className="mt-8">
          <SectionHeader className="px-1" title={`GW${next.id} fixtures`} href={`/fixtures?gw=${next.id}`} />
          <ul className="card mt-3 divide-y divide-line/70">
            {fixtures.map(({ fixture, home: h, away: a }) => (
              <li key={fixture.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center justify-end gap-2 text-right font-semibold">
                  <span className="truncate">{h.name}</span>
                  <ClubBadge short={h.shortName} primary={h.primaryColor} secondary={h.secondaryColor} size={26} />
                </span>
                <span className="w-16 rounded-md bg-gray-100 py-0.5 text-center text-[11px] font-semibold tabular">{formatKickoff(fixture.kickoff).replace(/^\w+,?\s/, "")}</span>
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <ClubBadge short={a.shortName} primary={a.primaryColor} secondary={a.secondaryColor} size={26} />
                  <span className="truncate">{a.name}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/fantasy/table" className="mt-2 flex items-center justify-end gap-1 px-1 text-sm text-muted hover:text-ink">
            KPL table <ChevronRight size={15} />
          </Link>
        </section>
      )}
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p className="animate-fade-slide-up mt-3 rounded-lg border-l-4 border-green bg-green/20 px-4 py-3 text-sm">{children}</p>;
}
