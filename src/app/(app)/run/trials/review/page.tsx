import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { reviewTimeTrial } from "@/actions/running";
import { requireUser } from "@/lib/auth/session";
import { ageFrom, formatDate } from "@/lib/format";
import { trialLabel } from "@/lib/running/constants";
import { km, pace, raceTime } from "@/lib/running/format";
import { trialQueue } from "@/lib/running/queries";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/nav";

export const metadata: Metadata = { title: "Times to confirm" };

export default async function ReviewTrialsPage() {
  const user = await requireUser();
  if (user.role !== "club" || !user.verified) {
    return (
      <div className="px-4 pt-6">
        <EmptyState title="For verified clubs" body="Clubs with a green tick confirm their athletes' times here." action={<Link href="/me/verify" className="btn btn-secondary">Get verified</Link>} />
      </div>
    );
  }
  const queue = await trialQueue(user.id);
  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/run" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Riadha Run
      </Link>
      <div>
        <p className="kicker">{user.displayName}</p>
        <h1 className="h2">Times to confirm</h1>
        <p className="mt-1 text-[14px] text-muted">Only confirm times your club timed or saw on an official results sheet. Your club&apos;s name appears next to every time you confirm.</p>
      </div>
      {queue.length === 0 ? (
        <EmptyState title="All caught up" body="No times are waiting for you." />
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map(({ t, athlete, activity }) => {
            const age = ageFrom(athlete.dateOfBirth);
            return (
              <li key={t.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Avatar name={athlete.displayName} url={athlete.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${athlete.handle}`} className="block truncate font-semibold">{athlete.displayName}</Link>
                    <p className="text-[12px] text-muted">
                      {[athlete.county, age !== null ? `${age} yrs` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-muted">{trialLabel(t.event)}</p>
                    <p className="text-[24px] font-bold tracking-[-0.03em] tabular">{raceTime(t.ms)}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 border-t border-line px-4 py-3 text-[13px]">
                  <dt className="text-muted">When</dt>
                  <dd>{formatDate(t.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</dd>
                  <dt className="text-muted">Where</dt>
                  <dd>{t.venue}</dd>
                  {t.note && (
                    <>
                      <dt className="text-muted">Note</dt>
                      <dd>{t.note}</dd>
                    </>
                  )}
                  {activity?.id && (
                    <>
                      <dt className="text-muted">GPS run</dt>
                      <dd>
                        <Link href={`/run/a/${activity.id}`} className="font-semibold text-cobalt">{km(activity.distanceM)} km at {pace((activity.movingS / activity.distanceM) * 1000)}/km</Link>
                        {activity.flag && (
                          <span className="ml-2 inline-flex items-center gap-1 text-warning"><ShieldAlert size={12} /> failed checks</span>
                        )}
                      </dd>
                    </>
                  )}
                </dl>
                <form className="flex flex-col gap-2 border-t border-line p-4">
                  <input name="note" maxLength={300} placeholder="Note for the athlete (optional)" className="field" />
                  <div className="grid grid-cols-2 gap-2">
                    <button formAction={reviewTimeTrial.bind(null, t.id, "approved")} className="btn btn-primary">Confirm</button>
                    <button formAction={reviewTimeTrial.bind(null, t.id, "rejected")} className="btn btn-secondary">Can&apos;t confirm</button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
