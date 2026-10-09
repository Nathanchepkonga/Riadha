import "server-only";
import { and, arrayContains, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, businesses, type BusinessCategory } from "@/db/schema";

export async function listBusinesses(opts: { q?: string; category?: BusinessCategory; county?: string; sport?: string; limit?: number }) {
  const where: SQL[] = [eq(businesses.active, true)];
  if (opts.category) where.push(eq(businesses.category, opts.category));
  if (opts.county) where.push(eq(businesses.county, opts.county));
  if (opts.sport) where.push(arrayContains(businesses.sports, [opts.sport]));
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(businesses.name, like), ilike(businesses.description, like), ilike(businesses.address, like))!);
  }
  return db
    .select()
    .from(businesses)
    .where(and(...where))
    .orderBy(desc(businesses.verified), asc(businesses.name))
    .limit(opts.limit ?? 60);
}

export async function getBusiness(slug: string) {
  const [b] = await db.select().from(businesses).where(eq(businesses.slug, slug));
  return b ?? null;
}

export async function myBusinesses(ownerId: string) {
  return db.select().from(businesses).where(eq(businesses.ownerId, ownerId)).orderBy(asc(businesses.name));
}

export async function campaignsForOwner(ownerId: string) {
  return db
    .select({ campaign: adCampaigns, business: { id: businesses.id, name: businesses.name, slug: businesses.slug } })
    .from(adCampaigns)
    .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
    .where(eq(businesses.ownerId, ownerId))
    .orderBy(desc(adCampaigns.createdAt));
}
