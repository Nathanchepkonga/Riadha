import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { recalcGameweek, setGameweekFinished, updateDeadline } from "@/actions/admin";
import { db } from "@/db";
import { gameweeks } from "@/db/schema";
import { getGameweekFixtures } from "@/lib/fantasy/data";
import { formatKickoff } from "@/lib/format";
import { ClubBadge } from "@/components/ui/brand";

export const metadata: Metadata = { title: "Gameweek · Admin" };

function toNairobiLocal(d: Date) {
  return new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16);
}

export default async function GameweekAdmin({ params }: PageProps<"/admin/gameweeks/[id]">) {
  const id = Number((await params).id);
  const [gw] = await db.select().from(gameweeks).where(eq(gameweeks.id, id));
  if (!gw) notFound();
  const fixtures = await getGameweekFixtures(id);

  return (
    <div>
      <Link href="/admin/gameweeks" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft size={16} /> Gameweeks</Link>
      <h1 className="mt-1 h2">Gameweek {id}</h1>

      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <form action={updateDeadline.bind(null, id)} className="flex flex-1 items-end gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="deadline">Deadline (Nairobi time)</label>
            <input id="deadline" name="deadline" type="datetime-local" defaultValue={toNairobiLocal(gw.deadline)} className="field h-10" />
          </div>
          <button className="btn btn-secondary h-10">Save</button>
        </form>
        <div className="flex gap-2">
          <form action={recalcGameweek.bind(null, id)}><button className="btn btn-secondary h-10">Recalculate</button></form>
          <form action={setGameweekFinished.bind(null, id, !gw.finished)}>
            <button className={gw.finished ? "btn btn-secondary h-10" : "btn btn-primary h-10"}>{gw.finished ? "Reopen" : "Mark finished"}</button>
          </form>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Marking a gameweek finished turns on auto-subs and the vice-captain fallback for every manager.</p>

      <ul className="card mt-4 divide-y divide-line/70">
        {fixtures.map(({ fixture: f, home, away }) => (
          <li key={f.id}>
            <Link href={`/admin/fixtures/${f.id}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100">
              <span className="flex items-center justify-end gap-2 text-right font-semibold">
                {home.name} <ClubBadge short={home.shortName} primary={home.primaryColor} secondary={home.secondaryColor} size={24} />
              </span>
              <span className="w-16 text-center font-bold">{f.homeScore !== null ? `${f.homeScore} – ${f.awayScore}` : formatKickoff(f.kickoff).split(",")[0]}</span>
              <span className="flex items-center gap-2 font-semibold">
                <ClubBadge short={away.shortName} primary={away.primaryColor} secondary={away.secondaryColor} size={24} /> {away.name}
              </span>
              <span className={f.finished ? "rounded bg-green px-1.5 text-xs font-semibold text-navy" : "text-xs font-semibold text-cobalt"}>{f.finished ? "FT" : "Enter"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
