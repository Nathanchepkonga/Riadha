import "server-only";
import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adEvents, businesses, type User } from "@/db/schema";
import { ageFrom } from "@/lib/format";

export type Placement = "home" | "watch" | "market";

export type ServedAd = {
  id: number;
  headline: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string;
  business: { name: string; slug: string; category: string; logoUrl: string | null; verified: boolean; county: string };
};

/**
 * Active campaigns that target this viewer. Empty targeting arrays mean "everyone"; age limits only
 * apply when we know the viewer's age. Campaigns with the fewest impressions are served first so
 * delivery is spread across advertisers. Under-18s (and signed-out visitors) only see ads from
 * businesses the Riadha team has verified.
 */
export async function getAdsFor(viewer: Pick<User, "id" | "sport" | "county" | "role" | "dateOfBirth"> | null, limit = 2): Promise<ServedAd[]> {
  const now = new Date();
  const age = ageFrom(viewer?.dateOfBirth);
  const rows = await db
    .select({
      id: adCampaigns.id,
      headline: adCampaigns.headline,
      body: adCampaigns.body,
      imageUrl: adCampaigns.imageUrl,
      ctaLabel: adCampaigns.ctaLabel,
      business: {
        name: businesses.name,
        slug: businesses.slug,
        category: businesses.category,
        logoUrl: businesses.logoUrl,
        verified: businesses.verified,
        county: businesses.county,
      },
    })
    .from(adCampaigns)
    .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
    .where(
      and(
        eq(adCampaigns.status, "active"),
        eq(businesses.active, true),
        lte(adCampaigns.startsAt, now),
        or(isNull(adCampaigns.endsAt), gte(adCampaigns.endsAt, now)),
        viewer?.sport ? sql`(cardinality(${adCampaigns.targetSports}) = 0 or ${viewer.sport} = any(${adCampaigns.targetSports}))` : sql`cardinality(${adCampaigns.targetSports}) = 0`,
        viewer?.county ? sql`(cardinality(${adCampaigns.targetCounties}) = 0 or ${viewer.county} = any(${adCampaigns.targetCounties}))` : sql`cardinality(${adCampaigns.targetCounties}) = 0`,
        viewer ? sql`(cardinality(${adCampaigns.targetRoles}) = 0 or ${viewer.role} = any(${adCampaigns.targetRoles}))` : sql`true`,
        age !== null ? sql`(${adCampaigns.minAge} is null or ${adCampaigns.minAge} <= ${age}) and (${adCampaigns.maxAge} is null or ${adCampaigns.maxAge} >= ${age})` : sql`true`,
        !viewer || (age !== null && age < 18) ? eq(businesses.verified, true) : undefined,
      ),
    )
    .orderBy(sql`(select count(*) from ad_events e where e.campaign_id = ${adCampaigns.id} and e.kind = 'impression') asc, random()`)
    .limit(limit);
  return rows;
}

export async function campaignStats(campaignIds: number[]) {
  if (campaignIds.length === 0) return new Map<number, { impressions: number; clicks: number }>();
  const rows = await db
    .select({
      campaignId: adEvents.campaignId,
      impressions: sql<number>`count(*) filter (where ${adEvents.kind} = 'impression')::int`,
      clicks: sql<number>`count(*) filter (where ${adEvents.kind} = 'click')::int`,
    })
    .from(adEvents)
    .where(inArray(adEvents.campaignId, campaignIds))
    .groupBy(adEvents.campaignId);
  return new Map(rows.map((r) => [r.campaignId, { impressions: r.impressions, clicks: r.clicks }]));
}
