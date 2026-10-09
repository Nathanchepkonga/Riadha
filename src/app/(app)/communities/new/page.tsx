import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { CommunityForm } from "@/components/communities/forms";

export const metadata: Metadata = { title: "Start a community" };

export default async function NewCommunityPage() {
  await requireUser();
  return (
    <div className="px-4 pt-4">
      <Link href="/communities" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Communities
      </Link>
      <p className="kicker mt-3">New community</p>
      <h1 className="h2">Start your crew</h1>
      <p className="mt-1 text-[14px] text-muted">You&apos;ll be the owner. You can add admins and events once it&apos;s live.</p>
      <div className="mt-6">
        <CommunityForm />
      </div>
    </div>
  );
}
