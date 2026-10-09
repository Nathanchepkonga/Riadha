import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { myBusinesses } from "@/lib/market";
import { EmptyState } from "@/components/ui/nav";
import { CampaignForm } from "@/components/market/campaign-form";

export const metadata: Metadata = { title: "New ad" };

export default async function NewAdPage({ searchParams }: PageProps<"/market/ads/new">) {
  const user = await requireUser();
  const biz = (await myBusinesses(user.id)).filter((b) => b.active);
  const wanted = Number((await searchParams).business);

  return (
    <div className="px-4 pt-4">
      <Link href="/market/manage" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Your listings & ads
      </Link>
      <p className="kicker mt-3">Promote</p>
      <h1 className="h2">New ad</h1>
      <p className="mt-1 text-[14px] text-muted">Shown on Home, in Watch and on the Marketplace to the people you choose.</p>
      <div className="mt-6">
        {biz.length === 0 ? (
          <EmptyState title="List a business first" body="Ads promote a marketplace listing." action={<Link href="/market/new" className="btn btn-accent">List your business</Link>} />
        ) : (
          <CampaignForm
            businesses={biz.map((b) => ({ id: b.id, name: b.name, category: b.category, county: b.county, logoUrl: b.logoUrl, coverUrl: b.coverUrl, verified: b.verified }))}
            initialBusinessId={biz.some((b) => b.id === wanted) ? wanted : undefined}
          />
        )}
      </div>
    </div>
  );
}
