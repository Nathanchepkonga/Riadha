import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { cn, formatDate } from "@/lib/format";
import { trialLabel } from "@/lib/running/constants";
import { raceTime } from "@/lib/running/format";
import { trialsFor, verifierClubs } from "@/lib/running/queries";
import { TrialForm } from "@/components/run/trial-form";

export const metadata: Metadata = { title: "Verified times" };

const STATUS = {
  pending: { label: "Waiting for the club", icon: Clock, tone: "bg-gray-100 text-ink" },
  approved: { label: "Verified", icon: BadgeCheck, tone: "bg-green text-navy" },
  rejected: { label: "Not confirmed", icon: XCircle, tone: "bg-danger/10 text-danger" },
} as const;

export default async function TrialsPage({ searchParams }: PageProps<"/run/trials">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [mine, clubs] = await Promise.all([trialsFor(user.id), verifierClubs()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const activityId = Number(sp.activity) || undefined;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/run" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Riadha Run
      </Link>
      <div>
        <p className="kicker">For scouts</p>
        <h1 className="h2">Verified times</h1>
        <p className="mt-1 text-[14px] text-muted">
          A time trial, a race or a fast GPS run: ask a verified club to confirm it. Confirmed times carry the club&apos;s name on your profile, and scouts can search by them.
        </p>
      </div>

      {mine.length > 0 && (
        <ul className="flex flex-col gap-2">
          {mine.map(({ t, club }) => {
            const st = STATUS[t.status];
            return (
              <li key={t.id} className="card p-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-muted">{trialLabel(t.event)} · {formatDate(t.date, { day: "numeric", month: "short", year: "numeric" })} · {t.venue}</span>
                    <span className="block text-[24px] font-bold tracking-[-0.03em] tabular">{raceTime(t.ms)}</span>
                  </span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", st.tone)}>
                    <st.icon size={13} /> {st.label}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {t.status === "approved" ? "Confirmed by" : "Sent to"} {club ? <Link href={`/u/${club.handle}`} className="font-semibold text-ink">{club.displayName}</Link> : "a club"}
                  {t.reviewNote ? ` · “${t.reviewNote}”` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card p-4">
        <h2 className="h5">Send a time</h2>
        <div className="mt-3">
          {clubs.length ? (
            <TrialForm clubs={clubs.filter((c) => c.id !== user.id)} defaults={{ event: typeof sp.event === "string" ? sp.event : undefined, time: typeof sp.time === "string" ? sp.time : undefined, activityId, date: today }} />
          ) : (
            <p className="text-[14px] text-muted">No verified clubs yet.</p>
          )}
        </div>
      </section>
      <p className="pb-2 text-[12px] text-muted">Clubs only confirm what they saw or timed. Asking a club to confirm a time you didn&apos;t run can get your account suspended.</p>
    </div>
  );
}
