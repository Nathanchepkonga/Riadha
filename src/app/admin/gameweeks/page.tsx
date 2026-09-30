import type { Metadata } from "next";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, gameweeks } from "@/db/schema";
import { getCurrentGameweek } from "@/lib/fantasy/engine";
import { cn, formatKickoff } from "@/lib/format";

export const metadata: Metadata = { title: "Gameweeks · Admin" };

export default async function GameweeksAdmin() {
  const [gws, counts, current] = await Promise.all([
    db.select().from(gameweeks).orderBy(asc(gameweeks.id)),
    db
      .select({ gw: fixtures.gameweekId, total: sql<number>`count(*)::int`, done: sql<number>`count(*) filter (where ${fixtures.finished})::int` })
      .from(fixtures)
      .groupBy(fixtures.gameweekId),
    getCurrentGameweek(db),
  ]);
  const byGw = new Map(counts.map((c) => [c.gw, c]));

  return (
    <div>
      <h1 className="h2">Gameweeks</h1>
      <p className="mt-1 text-sm text-muted">Enter match results and player stats after each game. Scores recalculate instantly for every manager.</p>
      <ul className="card mt-4 divide-y divide-line/70">
        {gws.map((gw) => {
          const c = byGw.get(gw.id);
          const locked = !!current && gw.id <= current.id;
          return (
            <li key={gw.id}>
              <Link href={`/admin/gameweeks/${gw.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100">
                <span className="w-14 h6">GW{gw.id}</span>
                <span className="flex-1 text-sm text-muted">Deadline {formatKickoff(gw.deadline)}</span>
                <span className="text-xs text-muted">{c?.done ?? 0}/{c?.total ?? 0}</span>
                <span className={cn("w-24 rounded-full px-2 py-0.5 text-center text-xs", gw.finished ? "bg-green font-semibold text-navy" : locked ? "bg-navy font-semibold text-white" : "bg-gray-100 text-muted")}>
                  {gw.finished ? "Finished" : locked ? "Live" : "Upcoming"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
