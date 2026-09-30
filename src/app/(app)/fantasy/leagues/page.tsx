import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Globe } from "lucide-react";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getEntry, getMyLeagues, getOverallRank } from "@/lib/fantasy/data";
import { getCurrentGameweek } from "@/lib/fantasy/engine";
import { LeagueForms } from "./league-forms";

export const metadata: Metadata = { title: "Leagues" };

export default async function LeaguesPage() {
  const user = await requireUser();
  const entry = await getEntry(user.id);
  if (!entry) {
    return (
      <div className="p-6 text-center">
        <p className="h4">Pick your squad first</p>
        <p className="mt-2 text-muted">Then create a league for your office, chama or estate.</p>
        <Link href="/fantasy/squad" className="btn btn-accent mt-5">Pick my squad</Link>
      </div>
    );
  }
  const [leagues, overall, current] = await Promise.all([getMyLeagues(entry.id), getOverallRank(entry.id), getCurrentGameweek(db)]);

  return (
    <div className="px-4 pt-5">
      <p className="kicker">{entry.teamName}</p>
      <h1 className="h2">Leagues</h1>

      <ul className="mt-5 flex flex-col gap-2">
        <li>
          <Link href="/fantasy/leagues/overall" className="card flex items-center gap-3 p-4 transition-colors hover:border-gray-400">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-green"><Globe size={20} /></span>
            <span className="flex-1">
              <span className="block font-semibold">Overall</span>
              <span className="text-xs text-muted">{overall.managers.toLocaleString("en-KE")} managers{current ? ` · after GW${current.id}` : ""}</span>
            </span>
            <span className="text-right">
              <span className="block font-semibold">#{overall.rank.toLocaleString("en-KE")}</span>
              <span className="text-xs text-muted">{overall.total} pts</span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </li>
        {leagues.map((l) => (
          <li key={l.id}>
            <Link href={`/fantasy/leagues/${l.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-gray-400">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-green text-lg font-bold text-navy">{l.name[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.name}</span>
                <span className="text-xs text-muted">{l.members} managers · code <span className="font-semibold tabular text-ink">{l.code}</span></span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <LeagueForms />
    </div>
  );
}
