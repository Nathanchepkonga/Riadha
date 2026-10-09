import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adEvents, businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { safeHttpUrl } from "@/lib/slug";

const PLACEMENTS = new Set(["home", "watch", "market"]);

/** Ad click-through: records the click, then redirects to the advertiser's link or Riadha listing. */
export async function GET(req: Request, ctx: RouteContext<"/ad/[id]">) {
  const campaignId = Number((await ctx.params).id);
  const url = new URL(req.url);
  if (!Number.isInteger(campaignId)) return Response.redirect(new URL("/market", url), 302);

  const [row] = await db
    .select({ status: adCampaigns.status, ctaUrl: adCampaigns.ctaUrl, slug: businesses.slug })
    .from(adCampaigns)
    .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
    .where(eq(adCampaigns.id, campaignId));
  if (!row) return Response.redirect(new URL("/market", url), 302);

  if (row.status === "active") {
    const user = await getCurrentUser();
    const p = url.searchParams.get("p");
    await db.insert(adEvents).values({ campaignId, userId: user?.id, kind: "click", placement: p && PLACEMENTS.has(p) ? p : null });
  }
  // The stored URL was validated on save; check again so this can never become an open redirect.
  const target = safeHttpUrl(row.ctaUrl) ?? new URL(`/market/${row.slug}`, url).toString();
  return Response.redirect(target, 302);
}
