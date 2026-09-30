import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { leaveLeague } from "@/actions/fantasy";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntry, getStandings } from "@/lib/fantasy/data";
import { getCurrentGameweek } from "@/lib/fantasy/engine";
import { cn } from "@/lib/format";
import { InviteButtons } from "./invite";

export const metadata: Metadata = { title: "League" };

export default async function LeaguePage({ params, searchParams }: PageProps<"/fantasy/leagues/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireUser();
  const overall = id === "overall";
  const leagueId = overall ? null : Number(id);
  if (!overall && !Number.isInteger(leagueId)) notFound();

  const [league] = leagueId ? await db.select().from(leagues).where(eq(leagues.id, leagueId)) : [null];
  if (!overall && !league) notFound();
  const [entry, current] = await Promise.all([getEntry(user.id), getCurrentGameweek(db)]);
  const standings = await getStandings(leagueId, current?.id ?? null, overall ? 200 : 500);
  const isMember = overall || standings.some((s) => s.entry_id === entry?.id);

  return (
    <div className="px-3 pt-4">
      <Link href="/fantasy/leagues" className="inline-flex items-center gap-1 px-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> Leagues
      </Link>
      <h1 className="mt-2 px-1 h2">{overall ? "Overall" : league!.name}</h1>
      {created && <p className="mt-3 rounded-lg border-l-4 border-green bg-green/20 px-4 py-3 text-sm">League created. Share the invite link so friends can join.</p>}
      {league && <InviteButtons code={league.code} name={league.name} />}

      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-100 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              <th className="w-12 px-3 py-2.5">#</th>
              <th className="px-2 py-2.5">Team</th>
              <th className="px-2 py-2.5 text-right">{current ? `GW${current.id}` : "GW"}</th>
              <th className="px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const me = s.entry_id === entry?.id;
              return (
                <tr key={s.entry_id} className={cn("border-b border-line/60 last:border-0", me && "bg-green/25")}>
                  <td className="px-3 py-2.5 font-semibold">{s.rank}</td>
                  <td className="px-2 py-2.5">
                    <span className={cn("block truncate font-semibold", me && "text-navy")}>{s.team_name}</span>
                    <Link href={`/u/${s.handle}`} className="text-xs text-muted hover:underline">{s.display_name}</Link>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular">{s.gw}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular">{s.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {standings.length === 0 && <p className="p-6 text-center text-muted">No managers yet.</p>}
      </div>

      {league && isMember && league.code !== "RIADHA" && (
        <form action={leaveLeague.bind(null, league.id)} className="mt-6 text-center">
          <button className="text-sm text-danger hover:underline">Leave league</button>
        </form>
      )}
    </div>
  );
}
