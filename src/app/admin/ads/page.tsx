import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { reviewCampaign, setCampaignStatus } from "@/actions/market";
import { db } from "@/db";
import { adCampaigns, businesses } from "@/db/schema";
import { campaignStats } from "@/lib/ads";
import { categoryLabel } from "@/lib/constants";
import { cn, compact, formatDate } from "@/lib/format";
import { VerifiedBusiness } from "@/components/market/business-card";

export const metadata: Metadata = { title: "Ads · Admin" };

export default async function AdsAdmin() {
  const rows = await db
    .select({ c: adCampaigns, b: businesses })
    .from(adCampaigns)
    .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
    .where(inArray(adCampaigns.status, ["pending", "active", "paused"]))
    .orderBy(desc(adCampaigns.createdAt))
    .limit(100);
  const pending = rows.filter((r) => r.c.status === "pending");
  const live = rows.filter((r) => r.c.status !== "pending");
  const stats = await campaignStats(live.map((r) => r.c.id));

  return (
    <div>
      <h1 className="h2">Ads</h1>
      <p className="mt-1 text-sm text-muted">
        {pending.length} waiting for review. Check the claim, the image and the audience: no alcohol, betting or unsafe supplements, and nothing for under-18s from unverified businesses.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {pending.map(({ c, b }) => (
          <li key={c.id} className="card overflow-hidden">
            <div className="flex gap-3 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- advertiser uploads
                  <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="bg-speed-tile absolute inset-0" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.headline}</p>
                <p className="mt-0.5 text-sm text-muted">{c.body}</p>
                <p className="mt-1 text-xs text-muted">
                  <Link href={`/market/${b.slug}`} className="font-semibold text-ink hover:underline">{b.name}</Link> · {categoryLabel(b.category)} · {b.county}{" "}
                  {b.verified && <VerifiedBusiness className="ml-1" />}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 border-t border-line px-4 py-3 text-sm">
              <dt className="text-muted">Button</dt>
              <dd className="break-all">
                {c.ctaLabel} → {c.ctaUrl ?? "Riadha listing"}
              </dd>
              <dt className="text-muted">Audience</dt>
              <dd className="capitalize">
                {[
                  c.targetRoles.join(", ") || "everyone",
                  c.targetSports.join(", ") || "all sports",
                  c.targetCounties.length ? `${c.targetCounties.length} counties` : "all Kenya",
                  c.minAge || c.maxAge ? `ages ${c.minAge ?? 13}–${c.maxAge ?? 99}` : "all ages",
                ].join(" · ")}
              </dd>
              <dt className="text-muted">Runs</dt>
              <dd>
                {formatDate(c.startsAt)}
                {c.endsAt ? ` to ${formatDate(c.endsAt)}` : ", no end date"}
              </dd>
            </dl>
            <form className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
              <input name="note" placeholder="Reason (sent to the advertiser if rejected)" className="field h-10 flex-1 md:text-sm" />
              <button formAction={reviewCampaign.bind(null, c.id, "active")} className="btn btn-primary h-10">Approve</button>
              <button formAction={reviewCampaign.bind(null, c.id, "rejected")} className="btn btn-secondary h-10">Reject</button>
            </form>
          </li>
        ))}
        {pending.length === 0 && <li className="card p-6 text-center text-muted">No ads waiting.</li>}
      </ul>

      {live.length > 0 && (
        <>
          <h2 className="h5 mt-10">Running</h2>
          <ul className="card mt-2 divide-y divide-line/70 text-sm">
            {live.map(({ c, b }) => {
              const s = stats.get(c.id) ?? { impressions: 0, clicks: 0 };
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.headline}</span>
                    <span className="text-xs text-muted">
                      {b.name} · {compact(s.impressions)} views · {compact(s.clicks)} clicks
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", c.status === "active" ? "bg-green text-navy" : "bg-gray-200")}>{c.status}</span>
                    <form>
                      <button formAction={setCampaignStatus.bind(null, c.id, c.status === "active" ? "paused" : "active")} className="text-xs font-semibold text-cobalt">
                        {c.status === "active" ? "Pause" : "Resume"}
                      </button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
