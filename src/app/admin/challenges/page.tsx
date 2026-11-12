import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { createChallenge, reviewChallenge } from "@/actions/running";
import { db } from "@/db";
import { businesses, challenges } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { raceTime } from "@/lib/running/format";
import { ChallengeForm } from "@/components/run/challenge-form";
import { goalText, lastDay } from "@/components/run/challenge-card";
import { Medal } from "@/components/run/medal";

export const metadata: Metadata = { title: "Challenges · Admin" };

export default async function ChallengesAdmin() {
  const [rows, biz] = await Promise.all([
    db.select({ c: challenges, sponsor: businesses.name }).from(challenges).leftJoin(businesses, eq(businesses.id, challenges.sponsorId)).orderBy(desc(challenges.createdAt)).limit(100),
    db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(eq(businesses.active, true)).orderBy(asc(businesses.name)),
  ]);
  const pending = rows.filter((r) => r.c.status === "pending");
  const live = rows.filter((r) => r.c.status === "live");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h2">Challenges</h1>
        <p className="mt-1 text-sm text-muted">{pending.length} sponsored proposal{pending.length === 1 ? "" : "s"} waiting. Check the claim, the dates and the cause: no betting, alcohol or unsafe supplements, nothing that pushes children to unsafe distances.</p>
      </div>

      {pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map(({ c, sponsor }) => (
            <li key={c.id} className="card overflow-hidden">
              <div className="flex gap-3 p-4">
                <Medal goalM={c.goalM} accent={c.accent} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-muted">{goalText(c)}{c.maxMs ? ` (${raceTime(c.maxMs)})` : ""} · {formatDate(c.startsAt, { day: "numeric", month: "short" })}{c.endsAt ? ` – ${formatDate(lastDay(c.endsAt), { day: "numeric", month: "short" })}` : ", always open"}</p>
                  <p className="text-xs text-muted">Sponsor: {sponsor ?? "none"}{c.cause ? ` · Cause: ${c.cause}` : ""}</p>
                  {c.description && <p className="mt-1 text-sm">{c.description}</p>}
                </div>
              </div>
              <form className="flex flex-col gap-2 border-t border-line p-4">
                <input name="note" maxLength={300} placeholder="Note for the business (shown if rejected)" className="field" />
                <div className="grid grid-cols-2 gap-2">
                  <button formAction={reviewChallenge.bind(null, c.id, "live")} className="btn btn-primary">Approve</button>
                  <button formAction={reviewChallenge.bind(null, c.id, "rejected")} className="btn btn-secondary">Reject</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}

      <section className="card p-4">
        <h2 className="h5">New challenge</h2>
        <p className="mt-1 text-[13px] text-muted">Ideas: a monthly 5K and 10K, a sub-25 5K, a 12K for Jamhuri Day, 100 km for a cause.</p>
        <div className="mt-4">
          <ChallengeForm action={createChallenge} sponsors={biz} />
        </div>
      </section>

      <section>
        <h2 className="h5">Live</h2>
        <ul className="mt-2 flex flex-col divide-y divide-line/70 rounded-2xl border border-line bg-surface">
          {live.map(({ c, sponsor }) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Medal goalM={c.goalM} accent={c.accent} size={36} />
              <Link href={`/challenges/${c.slug}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.title}</span>
                <span className="block truncate text-xs text-muted">{goalText(c)}{sponsor ? ` · ${sponsor}` : ""}</span>
              </Link>
              <span className="text-xs text-muted">{c.endsAt ? `ends ${formatDate(lastDay(c.endsAt), { day: "numeric", month: "short" })}` : "always open"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
