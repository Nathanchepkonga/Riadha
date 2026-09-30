import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { reviewVerification } from "@/actions/admin";
import { db } from "@/db";
import { users, verificationRequests } from "@/db/schema";
import { cn, formatDate } from "@/lib/format";
import { Tick } from "@/components/ui/tick";

export const metadata: Metadata = { title: "Verification · Admin" };

export default async function VerificationAdmin() {
  const rows = await db
    .select({ r: verificationRequests, u: users })
    .from(verificationRequests)
    .innerJoin(users, eq(users.id, verificationRequests.userId))
    .orderBy(desc(verificationRequests.createdAt))
    .limit(100);
  const pending = rows.filter((x) => x.r.status === "pending");
  const done = rows.filter((x) => x.r.status !== "pending");

  return (
    <div>
      <h1 className="h2">Verification</h1>
      <p className="mt-1 text-sm text-muted">{pending.length} waiting. Approving sets the user&apos;s role and tick, and deletes the evidence image.</p>

      <ul className="mt-4 flex flex-col gap-3">
        {pending.map(({ r, u }) => (
          <li key={r.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/u/${u.handle}`} className="font-semibold hover:underline">{u.displayName} <span className="text-sm font-normal text-muted">@{u.handle}</span></Link>
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize"><Tick role={r.type} verified size={13} /> {r.type}</span>
            </div>
            <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Legal name</dt><dd>{r.legalName}</dd>
              {r.organisation && (<><dt className="text-muted">Organisation</dt><dd>{r.organisation}</dd></>)}
              <dt className="text-muted">Evidence</dt><dd className="whitespace-pre-line">{r.details}</dd>
              <dt className="text-muted">Phone</dt><dd className="tabular">{u.phone}</dd>
              <dt className="text-muted">Sent</dt><dd>{formatDate(r.createdAt)}</dd>
            </dl>
            {r.evidenceUrl && (
              <a href={r.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-cobalt underline">Open attached image</a>
            )}
            <form className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input name="note" placeholder="Note to user (optional)" className="field h-10 flex-1 md:text-sm" />
              <button formAction={reviewVerification.bind(null, r.id, "approved")} className="btn btn-primary h-10">Approve</button>
              <button formAction={reviewVerification.bind(null, r.id, "rejected")} className="btn btn-secondary h-10">Reject</button>
            </form>
          </li>
        ))}
        {pending.length === 0 && <li className="card p-6 text-center text-muted">All caught up.</li>}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="mt-10 h5">History</h2>
          <ul className="card mt-2 divide-y divide-line/70 text-sm">
            {done.map(({ r, u }) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span>{u.displayName} · <span className="capitalize">{r.type}</span></span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs capitalize", r.status === "approved" ? "bg-green text-navy" : "bg-danger/10 text-danger")}>{r.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
