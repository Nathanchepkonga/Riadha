import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { updatePlayer } from "@/actions/admin";
import { db } from "@/db";
import { kplClubs, players } from "@/db/schema";
import { AddPlayerForm } from "./add-player";

export const metadata: Metadata = { title: "Players · Admin" };

export default async function PlayersAdmin({ searchParams }: PageProps<"/admin/players">) {
  const { club } = await searchParams;
  const clubs = await db.select().from(kplClubs).orderBy(asc(kplClubs.name));
  const clubId = Number(club) || clubs[0]?.id;
  const list = clubId ? await db.select().from(players).where(eq(players.clubId, clubId)).orderBy(asc(players.position), asc(players.name)) : [];

  return (
    <div>
      <h1 className="h2">Players</h1>
      <form className="mt-4 flex gap-2" action="/admin/players">
        <select name="club" defaultValue={clubId} className="field h-10 flex-1" aria-label="Club">
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-secondary h-10">Show</button>
      </form>

      <ul className="card mt-4 divide-y divide-line/70">
        {list.map((p) => (
          <li key={p.id}>
            <form action={updatePlayer.bind(null, p.id)} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-9 text-[11px] text-muted">{p.position}</span>
              <span className="flex-1 truncate font-semibold">{p.name}</span>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" name="available" defaultChecked={p.available} className="h-4 w-4 accent-[#081018]" /> Avail.
              </label>
              <input name="price" type="number" step="0.5" min="3.5" max="15" defaultValue={(p.price / 10).toFixed(1)} className="field h-9 w-20 px-2 text-center md:text-sm" aria-label={`${p.name} price`} />
              <button className="btn btn-secondary h-9 px-3 text-xs">Save</button>
            </form>
          </li>
        ))}
      </ul>

      <AddPlayerForm clubs={clubs.map((c) => ({ id: c.id, name: c.name }))} defaultClub={clubId} />
    </div>
  );
}
