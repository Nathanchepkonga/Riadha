import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getBusiness } from "@/lib/market";
import { BusinessForm } from "@/components/market/business-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditBusinessPage({ params }: PageProps<"/market/[slug]/edit">) {
  const user = await requireUser();
  const b = await getBusiness((await params).slug);
  if (!b || b.ownerId !== user.id) notFound();
  return (
    <div className="px-4 pt-4">
      <Link href={`/market/${b.slug}`} className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> {b.name}
      </Link>
      <h1 className="h2 mt-3">Edit listing</h1>
      <div className="mt-6">
        <BusinessForm
          values={{
            id: b.id,
            name: b.name,
            category: b.category,
            description: b.description,
            county: b.county,
            address: b.address ?? "",
            phone: b.phone ?? "",
            whatsapp: b.whatsapp ?? "",
            email: b.email ?? "",
            website: b.website ?? "",
            hours: b.hours ?? "",
            priceFrom: b.priceFrom === null ? "" : String(b.priceFrom),
            amenities: b.amenities,
            sports: b.sports,
            logoUrl: b.logoUrl,
            coverUrl: b.coverUrl,
          }}
        />
      </div>
    </div>
  );
}
