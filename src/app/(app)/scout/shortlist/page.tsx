import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ScoutStage } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";
import { getShortlist, shortlistCounts } from "@/lib/scout";
import { ChipRow, EmptyState } from "@/components/ui/nav";
import { ShortlistItem } from "@/components/scout/shortlist-item";

export const metadata: Metadata = { title: "Shortlist" };

const STAGES: { value: ScoutStage; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "contacted", label: "Contacted" },
  { value: "trial", label: "Trial" },
  { value: "signed", label: "Signed" },
];

export default async function ShortlistPage({ searchParams }: PageProps<"/scout/shortlist">) {
  const user = await requireUser();
  if (!canScout(user)) redirect("/scout");
  const raw = (await searchParams).stage;
  const stage = STAGES.find((s) => s.value === raw)?.value;
  const [entries, counts] = await Promise.all([getShortlist(user.id, stage), shortlistCounts(user.id)]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="px-4 pt-4">
      <Link href="/scout" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Scout portal
      </Link>
      <p className="kicker mt-3">Your pipeline</p>
      <h1 className="h2">Shortlist</h1>

      <ChipRow
        className="mt-4"
        label="Filter by stage"
        items={[
          { href: "/scout/shortlist", label: `All ${total}`, active: !stage },
          ...STAGES.map((s) => ({ href: `/scout/shortlist?stage=${s.value}`, label: `${s.label} ${counts[s.value] ?? 0}`, active: stage === s.value })),
        ]}
      />

      <div className="mt-5 flex flex-col gap-3" data-stagger="60">
        {entries.length === 0 ? (
          <EmptyState
            title={stage ? `No one at “${STAGES.find((s) => s.value === stage)!.label}”` : "Your shortlist is empty"}
            body="Tap the bookmark on any athlete in the Scout portal or on their profile to start tracking them."
            action={<Link href="/scout" className="btn btn-accent">Find talent</Link>}
          />
        ) : (
          entries.map((e) => (
            <ShortlistItem
              key={e.athlete.id}
              entry={{ stage: e.bookmark.stage, note: e.bookmark.note, updatedAt: e.bookmark.updatedAt.toISOString(), athlete: e.athlete }}
            />
          ))
        )}
      </div>
    </div>
  );
}
