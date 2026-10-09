import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { BusinessForm } from "@/components/market/business-form";

export const metadata: Metadata = { title: "List your business" };

export default async function NewBusinessPage() {
  await requireUser();
  return (
    <div className="px-4 pt-4">
      <Link href="/market" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Marketplace
      </Link>
      <p className="kicker mt-3">Marketplace</p>
      <h1 className="h2">List your business</h1>
      <p className="mt-1 text-[14px] text-muted">Free during the beta. Verified businesses get a badge and can reach under-18 athletes.</p>
      <div className="mt-6">
        <BusinessForm />
      </div>
    </div>
  );
}
