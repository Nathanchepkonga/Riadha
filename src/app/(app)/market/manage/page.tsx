import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Eye, Megaphone, MousePointerClick, Pencil, Percent, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { campaignStats } from "@/lib/ads";
import { campaignsForOwner, myBusinesses } from "@/lib/market";
import { categoryLabel } from "@/lib/constants";
import { cn, compact, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/nav";
import { BusinessLogo } from "@/components/market/ad-card";
import { VerifiedBusiness } from "@/components/market/business-card";
import { CampaignControls, ListingToggle } from "@/components/market/campaign-controls";
import { CountUp } from "@/components/motion/count-up";

export const metadata: Metadata = { title: "Manage business" };

const STATUS: Record<string, string> = {
  pending: "bg-warning/25 text-ink",
  active: "bg-green text-navy",
  paused: "bg-gray-200 text-ink",
  rejected: "bg-danger/15 text-danger",
  ended: "bg-gray-100 text-muted",
};

export default async function ManagePage({ searchParams }: PageProps<"/market/manage">) {
  const user = await requireUser();
  const submitted = (await searchParams).submitted === "1";
  const [biz, campaigns] = await Promise.all([myBusinesses(user.id), campaignsForOwner(user.id)]);
  const stats = await campaignStats(campaigns.map((c) => c.campaign.id));
  const totals = [...stats.values()].reduce((t, s) => ({ impressions: t.impressions + s.impressions, clicks: t.clicks + s.clicks }), { impressions: 0, clicks: 0 });
  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <div className="px-4 pt-4">
      <Link href="/market" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Marketplace
      </Link>
      <p className="kicker mt-3">Business</p>
      <h1 className="h2">Your listings & ads</h1>

      {submitted && <p role="status" className="animate-fade-slide-up mt-4 rounded-lg border-l-4 border-green bg-green/20 px-4 py-3 text-sm">Ad submitted. We&apos;ll review it within a day and it goes live on its start date.</p>}

      {biz.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No listings yet" body="List your gym, academy, shop or clinic to reach athletes near you." action={<Link href="/market/new" className="btn btn-accent">List your business</Link>} />
        </div>
      ) : (
        <>
          {campaigns.length > 0 && (
            <dl className="mt-5 grid grid-cols-3 gap-2" data-stagger="80">
              {[
                [Eye, "Views", totals.impressions, ""],
                [MousePointerClick, "Clicks", totals.clicks, ""],
                [Percent, "CTR", Math.round(ctr * 10), "%"],
              ].map(([Icon, label, n, unit], i) => {
                const I = Icon as typeof Eye;
                return (
                  <div key={label as string} data-reveal="up" className={cn("rounded-2xl p-3", i === 0 ? "bg-navy text-white" : "border border-line bg-surface")}>
                    <dt className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]", i === 0 ? "text-white/55" : "text-muted")}>
                      <I size={12} /> {label as string}
                    </dt>
                    <dd className="mt-1 text-[24px] font-bold tracking-[-0.03em] tabular">
                      {unit === "%" ? `${(Number(n) / 10).toFixed(1)}%` : <CountUp to={Number(n)} />}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <section className="mt-6">
            <h2 className="h5">Listings</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {biz.map((b) => (
                <li key={b.id} className="card flex items-center gap-3 p-3">
                  <BusinessLogo name={b.name} url={b.logoUrl} size={44} />
                  <Link href={`/market/${b.slug}`} className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {b.name} {b.verified && <VerifiedBusiness />}
                    </p>
                    <p className="text-[12px] text-muted">
                      {categoryLabel(b.category)} · {b.county}
                      {!b.active && " · hidden"}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Link href={`/market/${b.slug}/edit`} aria-label={`Edit ${b.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <Pencil size={14} />
                    </Link>
                    <ListingToggle id={b.id} active={b.active} />
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/market/new" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-cobalt">
              <Plus size={14} /> Add another
            </Link>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="h5">Ads</h2>
              <Link href="/market/ads/new" className="btn btn-cobalt btn-sm">
                <Megaphone size={14} /> New ad
              </Link>
            </div>
            {campaigns.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-center text-[14px] text-muted">Reach athletes by sport, county and age. Your first ad takes two minutes.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3" data-stagger="60">
                {campaigns.map(({ campaign: c, business }) => {
                  const s = stats.get(c.id) ?? { impressions: 0, clicks: 0 };
                  const rate = s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(1) : "0.0";
                  const audience = [c.targetRoles.length ? c.targetRoles.join(", ") : "everyone", c.targetSports.length ? c.targetSports.join(", ") : null, c.targetCounties.length ? `${c.targetCounties.length} count${c.targetCounties.length === 1 ? "y" : "ies"}` : "all Kenya", c.minAge || c.maxAge ? `ages ${c.minAge ?? 13}–${c.maxAge ?? "99"}` : null].filter(Boolean).join(" · ");
                  return (
                    <li key={c.id} data-reveal="up" className="card overflow-hidden">
                      <div className="flex gap-3 p-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-navy">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- advertiser uploads
                            <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <span className="bg-speed-tile absolute inset-0" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 font-semibold leading-snug">{c.headline}</p>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS[c.status])}>{c.status}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted">{business.name} · from {formatDate(c.startsAt, { day: "numeric", month: "short" })}{c.endsAt ? ` to ${formatDate(c.endsAt, { day: "numeric", month: "short" })}` : ""}</p>
                          <p className="truncate text-[12px] capitalize text-muted">{audience}</p>
                        </div>
                      </div>
                      {c.status === "rejected" && c.reviewNote && <p className="mx-3 mb-3 rounded-lg bg-danger/8 px-3 py-2 text-[12px]">Not approved: {c.reviewNote}</p>}
                      <div className="flex items-center justify-between border-t border-line px-3 py-2">
                        <p className="flex gap-3 text-[12px] text-muted tabular">
                          <span><span className="font-semibold text-ink">{compact(s.impressions)}</span> views</span>
                          <span><span className="font-semibold text-ink">{compact(s.clicks)}</span> clicks</span>
                          <span><span className="font-semibold text-ink">{rate}%</span> CTR</span>
                        </p>
                        <CampaignControls id={c.id} status={c.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
