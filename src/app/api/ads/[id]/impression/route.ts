import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

const PLACEMENTS = new Set(["home", "watch", "market"]);

/** Impression beacon, sent once when an ad is at least half on screen. */
export async function POST(req: Request, ctx: RouteContext<"/api/ads/[id]/impression">) {
  // Only count beacons sent by our own pages.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });
  const campaignId = Number((await ctx.params).id);
  if (!Number.isInteger(campaignId)) return new Response(null, { status: 404 });
  const placement = new URL(req.url).searchParams.get("p");

  const [campaign] = await db.select({ status: adCampaigns.status }).from(adCampaigns).where(eq(adCampaigns.id, campaignId));
  if (campaign?.status !== "active") return new Response(null, { status: 204 });

  const user = await getCurrentUser();
  if (user) {
    // One impression per person per campaign every 30 minutes.
    const [recent] = await db
      .select({ id: adEvents.id })
      .from(adEvents)
      .where(and(eq(adEvents.campaignId, campaignId), eq(adEvents.userId, user.id), eq(adEvents.kind, "impression"), gt(adEvents.createdAt, new Date(Date.now() - 30 * 60_000))))
      .limit(1);
    if (recent) return new Response(null, { status: 204 });
  }
  await db.insert(adEvents).values({ campaignId, userId: user?.id, kind: "impression", placement: placement && PLACEMENTS.has(placement) ? placement : null });
  return new Response(null, { status: 204 });
}
