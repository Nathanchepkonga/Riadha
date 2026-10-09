import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { setBusinessListed, setBusinessVerified } from "@/actions/market";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { categoryLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { VerifiedBusiness } from "@/components/market/business-card";

export const metadata: Metadata = { title: "Businesses · Admin" };

export default async function BusinessesAdmin() {
  const rows = await db
    .select({ b: businesses, owner: { handle: users.handle, displayName: users.displayName, phone: users.phone } })
    .from(businesses)
    .innerJoin(users, eq(users.id, businesses.ownerId))
    .orderBy(businesses.verified, desc(businesses.createdAt))
    .limit(200);

  return (
    <div>
      <h1 className="h2">Businesses</h1>
      <p className="mt-1 text-sm text-muted">
        Verify a business once you&apos;ve confirmed it&apos;s real (a call, a visit or a registration document). Verified businesses get a badge and may advertise to under-18s.
      </p>
      <ul className="card mt-4 divide-y divide-line/70">
        {rows.map(({ b, owner }) => (
          <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                <Link href={`/market/${b.slug}`} className="hover:underline">{b.name}</Link>
                {b.verified && <VerifiedBusiness />}
                {!b.active && <span className="rounded bg-gray-200 px-1.5 text-[10px] font-semibold uppercase">Hidden</span>}
              </p>
              <p className="text-xs text-muted">
                {categoryLabel(b.category)} · {b.county} · listed {formatDate(b.createdAt)} by{" "}
                <Link href={`/u/${owner.handle}`} className="font-semibold text-ink">{owner.displayName}</Link> <span className="tabular">({owner.phone})</span>
              </p>
            </div>
            <form className="flex shrink-0 gap-2">
              <button formAction={setBusinessVerified.bind(null, b.id, !b.verified)} className={b.verified ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}>
                {b.verified ? "Remove badge" : "Verify"}
              </button>
              <button formAction={setBusinessListed.bind(null, b.id, !b.active)} className="btn btn-ghost btn-sm">
                {b.active ? "Hide" : "Re-list"}
              </button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-muted">No businesses listed yet.</li>}
      </ul>
    </div>
  );
}
