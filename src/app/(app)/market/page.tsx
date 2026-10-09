import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";
import type { BusinessCategory } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getAdsFor } from "@/lib/ads";
import { listBusinesses, myBusinesses } from "@/lib/market";
import { BUSINESS_CATEGORIES, COUNTIES, SPORTS } from "@/lib/constants";
import { PageHero } from "@/components/ui/page-hero";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState } from "@/components/ui/nav";
import { AdCard } from "@/components/market/ad-card";
import { BusinessCard } from "@/components/market/business-card";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const category = BUSINESS_CATEGORIES.find((c) => c.value === sp.category)?.value as BusinessCategory | undefined;
  const county = typeof sp.county === "string" && COUNTIES.includes(sp.county) ? sp.county : undefined;
  const sport = typeof sp.sport === "string" && SPORTS.includes(sp.sport) ? sp.sport : undefined;

  const [list, mine, ads] = await Promise.all([listBusinesses({ q: q || undefined, category, county, sport }), myBusinesses(user.id), getAdsFor(user, 1)]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const all = { q: q || undefined, category, county, sport, ...patch };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/market?${s}` : "/market";
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      <PageHero kicker="Marketplace" title="Gear up. *Train smarter.*" body="Gyms, academies, sports shops, physios and pitches near you, picked for athletes.">
        <div className="flex flex-wrap gap-2">
          <Link href="/market/new" className="btn btn-accent">
            <Plus size={16} strokeWidth={3} /> List your business
          </Link>
          {mine.length > 0 && (
            <Link href="/market/manage" className="btn btn-ghost-light">
              <LayoutDashboard size={16} /> Manage
            </Link>
          )}
        </div>
      </PageHero>

      <form action="/market" role="search" className="flex flex-col gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <SearchField defaultValue={q} placeholder="Search gyms, academies, physios…" />
        <div className="grid grid-cols-2 gap-2">
          <select name="county" defaultValue={county ?? ""} aria-label="County" className="field field-sm">
            <option value="">All counties</option>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select name="sport" defaultValue={sport ?? ""} aria-label="Sport" className="field field-sm">
            <option value="">Any sport</option>
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button type="submit" className="sr-only">Search</button>
      </form>
      <ChipRow label="Categories" items={[{ href: qs({ category: undefined }), label: "All", active: !category }, ...BUSINESS_CATEGORIES.map((c) => ({ href: qs({ category: c.value }), label: c.plural, active: category === c.value }))]} />

      {ads[0] && !q && <AdCard ad={ads[0]} placement="market" />}

      <section>
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{list.length}</span> place{list.length === 1 ? "" : "s"}
          {county ? ` in ${county}` : " across Kenya"}
        </p>
        <div className="mt-3 grid gap-3 min-[560px]:grid-cols-2" data-stagger="70">
          {list.length === 0 ? (
            <div className="min-[560px]:col-span-2">
              <EmptyState title="Nothing listed here yet" body="Know a great gym, academy or physio? Tell them about Riadha, or list your own business." action={<Link href="/market/new" className="btn btn-accent">List a business</Link>} />
            </div>
          ) : (
            list.map((b) => <BusinessCard key={b.id} b={b} />)
          )}
        </div>
      </section>
    </div>
  );
}
