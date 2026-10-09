"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { adCampaigns, businessCategoryEnum, businesses, roleEnum } from "@/db/schema";
import { actionUser, getCurrentUser } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { COUNTIES, SPORTS } from "@/lib/constants";
import { safeHttpUrl, uniqueSlug } from "@/lib/slug";
import { saveUpload } from "@/lib/storage";

type State = { error?: string; ok?: string } | undefined;

async function ownedBusiness(id: number, userId: string) {
  const [b] = await db.select().from(businesses).where(and(eq(businesses.id, id), eq(businesses.ownerId, userId)));
  if (!b) throw new Error("You don't manage this business.");
  return b;
}

/** Distinct, trimmed, non-empty values for a repeated form field. */
function list(form: FormData, name: string, max: number, allowed?: string[]) {
  const values = form
    .getAll(name)
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter((v) => v && v.length <= 40 && (!allowed || allowed.includes(v)));
  return [...new Set(values)].slice(0, max);
}

const businessSchema = z.object({
  name: z.string().trim().min(2, "Add your business name.").max(60),
  category: z.enum(businessCategoryEnum.enumValues, { error: "Pick a category." }),
  description: z.string().trim().min(20, "Describe what you offer (20+ characters).").max(1200),
  county: z.enum(COUNTIES as [string, ...string[]], { error: "Pick a county." }),
  address: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  whatsapp: z.string().trim().max(20),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  website: z.string().trim().max(200),
  hours: z.string().trim().max(80),
  priceFrom: z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)]),
});

export async function saveBusiness(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const editingId = Number(form.get("id")) || null;
  const existing = editingId ? await ownedBusiness(editingId, user.id) : null;

  const parsed = businessSchema.safeParse(
    Object.fromEntries(Object.keys(businessSchema.shape).map((k) => [k, String(form.get(k) ?? "").trim()])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "The phone number doesn't look right." };
  const whatsapp = d.whatsapp ? normalizePhone(d.whatsapp) : null;
  if (d.whatsapp && !whatsapp) return { error: "The WhatsApp number doesn't look right." };
  const website = d.website ? safeHttpUrl(d.website) : null;
  if (d.website && !website) return { error: "The website must be a normal web address." };
  if (!phone && !whatsapp && !d.email) return { error: "Add at least one way for athletes to reach you." };

  if (!existing) {
    const [owned] = await db.select({ n: count() }).from(businesses).where(eq(businesses.ownerId, user.id));
    if (owned.n >= 5) return { error: "You can list up to 5 businesses." };
  }

  let logo, cover;
  try {
    logo = await saveUpload(form.get("logo"), ["image"]);
    cover = await saveUpload(form.get("cover"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const values = {
    name: d.name,
    category: d.category,
    description: d.description,
    county: d.county,
    address: d.address || null,
    phone,
    whatsapp,
    email: d.email || null,
    website,
    hours: d.hours || null,
    priceFrom: d.priceFrom === "" ? null : d.priceFrom,
    amenities: list(form, "amenities", 20),
    sports: list(form, "sports", 12, SPORTS),
    ...(logo && { logoUrl: logo.url }),
    ...(cover && { coverUrl: cover.url }),
  };

  let slug: string;
  if (existing) {
    await db.update(businesses).set(values).where(eq(businesses.id, existing.id));
    slug = existing.slug;
  } else {
    // "new", "manage" and "ads" are routes under /market, so they can't be slugs.
    slug = await uniqueSlug(d.name, async (s) => ["new", "manage", "ads"].includes(s) || (await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, s))).length > 0);
    await db.insert(businesses).values({ ...values, slug, ownerId: user.id });
  }
  revalidatePath("/market");
  revalidatePath(`/market/${slug}`);
  redirect(`/market/${slug}`);
}

/** Owner hides or re-lists their business. Hidden listings and their ads stop showing. */
export async function setBusinessListed(id: number, active: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in again.");
  if (!user.isAdmin) await ownedBusiness(id, user.id);
  await db.update(businesses).set({ active }).where(eq(businesses.id, id));
  revalidatePath("/market");
  revalidatePath("/market/manage");
  revalidatePath("/admin/businesses");
}

/* ───────── Ad campaigns ───────── */

const TARGET_ROLES = roleEnum.enumValues as readonly string[];

const campaignSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  headline: z.string().trim().min(3, "Write a headline.").max(60, "Keep the headline under 60 characters."),
  body: z.string().trim().min(10, "Add a line about the offer (10+ characters).").max(160, "Keep the text under 160 characters."),
  ctaLabel: z.string().trim().min(2).max(20),
  ctaUrl: z.string().trim().max(300),
  minAge: z.union([z.literal(""), z.coerce.number().int().min(13).max(99)]),
  maxAge: z.union([z.literal(""), z.coerce.number().int().min(13).max(99)]),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
  endsAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

export async function createCampaign(_prev: State, form: FormData): Promise<State> {
  const user = await actionUser();
  const parsed = campaignSchema.safeParse(
    Object.fromEntries(Object.keys(campaignSchema.shape).map((k) => [k, String(form.get(k) ?? "").trim()])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const business = await ownedBusiness(d.businessId, user.id);
  if (!business.active) return { error: "Re-list your business before advertising it." };

  const ctaUrl = d.ctaUrl ? safeHttpUrl(d.ctaUrl) : null;
  if (d.ctaUrl && !ctaUrl) return { error: "The link must be a normal web address." };
  if (d.minAge !== "" && d.maxAge !== "" && d.minAge > d.maxAge) return { error: "The minimum age is above the maximum." };
  const startsAt = new Date(`${d.startsAt}T00:00:00+03:00`);
  const endsAt = d.endsAt ? new Date(`${d.endsAt}T23:59:59+03:00`) : null;
  if (endsAt && endsAt <= startsAt) return { error: "The end date must be after the start date." };

  const [open] = await db
    .select({ n: count() })
    .from(adCampaigns)
    .where(and(eq(adCampaigns.businessId, business.id), eq(adCampaigns.status, "pending")));
  if (open.n >= 3) return { error: "You already have 3 ads waiting for review." };

  let image;
  try {
    image = await saveUpload(form.get("image"), ["image"]);
  } catch (e) {
    return { error: (e as Error).message };
  }

  await db.insert(adCampaigns).values({
    businessId: business.id,
    headline: d.headline,
    body: d.body,
    ctaLabel: d.ctaLabel,
    ctaUrl,
    imageUrl: image?.url ?? business.coverUrl,
    targetSports: list(form, "targetSports", 12, SPORTS),
    targetCounties: list(form, "targetCounties", 47, COUNTIES),
    targetRoles: list(form, "targetRoles", 4, [...TARGET_ROLES]),
    minAge: d.minAge === "" ? null : d.minAge,
    maxAge: d.maxAge === "" ? null : d.maxAge,
    startsAt,
    endsAt,
  });
  revalidatePath("/market/manage");
  revalidatePath("/admin/ads");
  redirect("/market/manage?submitted=1");
}

/** Owners pause or resume an approved campaign, or end it for good. */
export async function setCampaignStatus(id: number, status: "active" | "paused" | "ended") {
  const user = await actionUser();
  const [row] = await db
    .select({ campaign: adCampaigns, ownerId: businesses.ownerId })
    .from(adCampaigns)
    .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
    .where(eq(adCampaigns.id, id));
  if (!row || (row.ownerId !== user.id && !user.isAdmin)) throw new Error("You don't manage this ad.");
  const from = row.campaign.status;
  const allowed =
    (status === "paused" && from === "active") ||
    (status === "active" && from === "paused") ||
    (status === "ended" && (from === "active" || from === "paused" || from === "pending"));
  if (!allowed) throw new Error(`A ${from} ad can't be set to ${status}.`);
  await db.update(adCampaigns).set({ status }).where(eq(adCampaigns.id, id));
  revalidatePath("/market/manage");
  revalidatePath("/admin/ads");
}

/* ───────── Admin moderation ───────── */

async function admin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admins only.");
  return user;
}

export async function reviewCampaign(id: number, decision: "active" | "rejected", form: FormData) {
  await admin();
  const typed = String(form.get("note") ?? "").trim().slice(0, 300);
  // Advertisers always get a reason when an ad is turned down.
  const note = typed || (decision === "rejected" ? "This ad doesn't meet the Riadha ad guidelines." : null);
  await db
    .update(adCampaigns)
    .set({ status: decision, reviewNote: note })
    .where(and(eq(adCampaigns.id, id), eq(adCampaigns.status, "pending")));
  revalidatePath("/admin/ads");
  revalidatePath("/market/manage");
}

export async function setBusinessVerified(id: number, verified: boolean) {
  await admin();
  const [b] = await db.update(businesses).set({ verified }).where(eq(businesses.id, id)).returning({ slug: businesses.slug });
  revalidatePath("/admin/businesses");
  if (b) revalidatePath(`/market/${b.slug}`);
}
