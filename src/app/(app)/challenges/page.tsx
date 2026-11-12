import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { listChallenges, medalsFor } from "@/lib/running/queries";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState, SectionHeader } from "@/components/ui/nav";
import { ChallengeCard } from "@/components/run/challenge-card";
import { Medal } from "@/components/run/medal";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await requireUser();
  const [all, medals] = await Promise.all([listChallenges(user.id), medalsFor(user.id)]);
  const open = all.filter((r) => r.state === "live");
  const mine = open.filter((r) => r.entry && !r.entry.completedAt);
  const notJoined = open.filter((r) => !r.entry);
  const distance = notJoined.filter((r) => r.c.kind === "single");
  const totals = notJoined.filter((r) => r.c.kind === "total");
  const upcoming = all.filter((r) => r.state === "upcoming");

  const list = (rows: typeof all) => (
    <div className="mt-3 flex flex-col gap-3" data-stagger="60">
      {rows.map((r) => (
        <div key={r.c.id} data-reveal="up" suppressHydrationWarning>
          <ChallengeCard c={r.c} entry={r.entry} participants={r.participants} sponsor={r.sponsor} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-7 px-4 pt-4">
      <PageHero kicker="Challenges" title="Run it. *Earn it.*" body="Join a challenge and every run inside its dates counts, including the ones you already did. Finish to earn the medal for your profile.">
        <Link href="/run/record" className="btn btn-accent">Record a run</Link>
      </PageHero>

      {mine.length > 0 && (
        <section>
          <SectionHeader title="In progress" />
          {list(mine)}
        </section>
      )}

      <section>
        <SectionHeader title="Distance challenges" />
        <p className="mt-1 text-[12px] text-muted">One run of the distance: your first 5K, a 10K, a sub-25 5K…</p>
        {distance.length ? list(distance) : <p className="mt-3 text-[14px] text-muted">You&apos;ve joined all of them. Nice.</p>}
      </section>

      {totals.length > 0 && (
        <section>
          <SectionHeader title="Totals and causes" />
          <p className="mt-1 text-[12px] text-muted">Add up kilometres over the month, for yourself or for a cause.</p>
          {list(totals)}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeader title="Coming up" />
          {list(upcoming)}
        </section>
      )}

      <section>
        <SectionHeader title="Your medals" />
        {medals.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No medals yet" body="Finish a challenge and its medal lands on your profile." />
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3" data-stagger="50">
            {medals.map((m) => (
              <li key={m.c.id} data-reveal="scale" suppressHydrationWarning>
                <Link href={`/challenges/${m.c.slug}`} className="card pressable flex flex-col items-center gap-2 p-4 text-center">
                  <Medal goalM={m.c.goalM} accent={m.c.accent} size={56} />
                  <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{m.c.title}</span>
                  <span className="text-[11px] text-muted">{formatDate(m.completedAt!, { day: "numeric", month: "short", year: "numeric" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
