"use client";

import { useEffect, useState } from "react";
import { Check, Gauge, Wifi } from "lucide-react";
import { Toggle } from "@/components/ui/controls";

const KEY = "riadha-data-saver";
const EVENT = "riadha-data-saver-change";

export function DataSaverSettings() {
  const [enabled, setEnabled] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEnabled(localStorage.getItem(KEY) === "1");
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      setNetwork(connection?.effectiveType ?? null);
    });
    return () => window.clearTimeout(timer);
  }, []);

  function change(value: boolean) {
    setEnabled(value);
    if (value) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-green"><Gauge size={19} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold">Data saver</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted">Use lower video quality, shorter buffers and less autoplay data. Photos and text are unchanged.</p>
        </div>
        <Toggle checked={enabled} onChange={change} small label="" />
      </div>
      <div className="flex items-center gap-2 border-t border-line/70 px-4 py-3 text-[12px] text-muted">
        {network ? <><Wifi size={14} /> Current network: <strong className="text-ink">{network}</strong></> : <><Check size={14} className="text-green" /> Riadha will adapt to your connection</>}
      </div>
    </section>
  );
}
