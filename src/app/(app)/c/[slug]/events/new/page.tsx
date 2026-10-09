import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getCommunity } from "@/lib/communities";
import { EventForm } from "@/components/communities/forms";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ params }: PageProps<"/c/[slug]/events/new">) {
  const user = await requireUser();
  const data = await getCommunity((await params).slug, user.id);
  if (!data) notFound();
  if (data.role !== "owner" && data.role !== "admin" && !user.isAdmin) redirect(`/c/${data.community.slug}?tab=events`);
  return (
    <div className="px-4 pt-4">
      <Link href={`/c/${data.community.slug}?tab=events`} className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> {data.community.name}
      </Link>
      <p className="kicker mt-3">New event</p>
      <h1 className="h2">Plan something</h1>
      <div className="mt-6">
        <EventForm communityId={data.community.id} />
      </div>
    </div>
  );
}
