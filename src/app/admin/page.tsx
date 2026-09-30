import type { Metadata } from "next";
import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactRequests, fantasyEntries, posts, users, verificationRequests } from "@/db/schema";
import { getCurrentGameweek, getNextGameweek } from "@/lib/fantasy/engine";
import { countdown } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const [[u], [a], [e], [p], [v], [c], current, next] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: sql<number>`count(*) filter (where ${users.role} = 'athlete')::int` }).from(users),
    db.select({ n: count() }).from(fantasyEntries),
    db.select({ n: count() }).from(posts),
    db.select({ n: count() }).from(verificationRequests).where(eq(verificationRequests.status, "pending")),
    db.select({ n: count() }).from(contactRequests),
    getCurrentGameweek(db),
    getNextGameweek(db),
  ]);
  const tiles = [
    ["Users", u.n],
    ["Athletes", a.n],
    ["Fantasy teams", e.n],
    ["Posts", p.n],
    ["Pending ticks", v.n],
    ["Contact requests", c.n],
  ] as const;

  return (
    <div>
      <h1 className="h2">Overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, n]) => (
          <div key={label} className="card p-4">
            <p className="kicker">{label}</p>
            <p className="mt-1 text-4xl font-bold tracking-[-0.04em] tabular">{n}</p>
          </div>
        ))}
      </div>
      <div className="card mt-4 p-4">
        <p className="font-semibold">Season</p>
        <p className="mt-1 text-sm text-muted">
          {current ? `GW${current.id} ${current.finished ? "finished" : "in progress"}. ` : "Season not started. "}
          {next ? `GW${next.id} deadline in ${countdown(next.deadline)}.` : "No more deadlines."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {current && <Link href={`/admin/gameweeks/${current.id}`} className="btn btn-primary h-10">Enter GW{current.id} results</Link>}
          {v.n > 0 && <Link href="/admin/verification" className="btn btn-accent h-10">Review {v.n} tick request{v.n > 1 ? "s" : ""}</Link>}
        </div>
      </div>
    </div>
  );
}
