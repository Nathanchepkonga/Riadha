import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { UploadRuns } from "@/components/run/upload-runs";

export const metadata: Metadata = { title: "Upload activities" };

export default async function UploadPage() {
  await requireUser();
  return (
    <div className="px-4 pt-4">
      <Link href="/run" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Riadha Run
      </Link>
      <p className="kicker mt-3">Upload</p>
      <h1 className="h2">From your watch or app</h1>
      <p className="mt-1 text-[14px] text-muted">
        Export the activity as a file (in Garmin Connect: ⋯ → Export Original; in most apps: Share → GPX) and choose it here.
      </p>
      <div className="mt-6">
        <UploadRuns />
      </div>
    </div>
  );
}
