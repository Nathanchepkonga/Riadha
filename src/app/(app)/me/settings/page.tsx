import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { DataSaverSettings } from "@/components/settings/data-saver";
import { NotificationPreferencesSettings } from "@/components/settings/notification-preferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...user.notificationPreferences };
  return (
    <div className="px-4 pt-5">
      <Link href="/me" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"><ChevronLeft size={16} /> Me</Link>
      <p className="kicker mt-4">Your experience</p>
      <h1 className="h2 mt-1">Settings</h1>
      <p className="mt-2 text-[14px] text-muted">Choose how Riadha behaves on your phone and network.</p>
      <div className="mt-6">
        <DataSaverSettings />
      </div>
      <div className="mt-4">
        <NotificationPreferencesSettings initial={preferences} />
      </div>
    </div>
  );
}
