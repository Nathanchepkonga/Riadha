"use client";

import { useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { updateNotificationPreferences } from "@/actions/notifications";
import { Toggle } from "@/components/ui/controls";
import type { NotificationPreferences } from "@/lib/notifications";

const OPTIONS: { key: keyof NotificationPreferences; label: string; body: string }[] = [
  { key: "social", label: "Social activity", body: "Follows, comments and collaboration requests." },
  { key: "community", label: "Community activity", body: "Event RSVPs and community updates." },
  { key: "challenges", label: "Challenges", body: "Challenge completions and medals." },
  { key: "verification", label: "Verification", body: "Updates about your verification request." },
  { key: "fantasy", label: "Fantasy", body: "Gameweek deadlines and score updates." },
  { key: "scouting", label: "Scouting", body: "When a club or scout saves your profile." },
];

export function NotificationPreferencesSettings({ initial }: { initial: NotificationPreferences }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function change(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...values, [key]: value };
    setValues(next);
    setSaved(false);
    start(async () => {
      await updateNotificationPreferences({ [key]: value });
      setSaved(true);
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-green"><Bell size={19} /></span>
        <div>
          <h2 className="text-[15px] font-bold">Notifications</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted">Choose the activity you want to hear about.</p>
        </div>
      </div>
      <div className="divide-y divide-line/70 border-t border-line/70">
        {OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">{option.label}</p>
              <p className="mt-0.5 text-[12px] text-muted">{option.body}</p>
            </div>
            <Toggle checked={values[option.key]} onChange={(value) => change(option.key, value)} small label="" disabled={pending} />
          </div>
        ))}
      </div>
      {saved && <p className="flex items-center gap-1.5 border-t border-line/70 px-4 py-3 text-[12px] text-muted"><Check size={14} className="text-green-700" /> Preferences saved</p>}
    </section>
  );
}
