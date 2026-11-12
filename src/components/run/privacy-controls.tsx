"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";
import { addPrivacyZone, setHideRoutes } from "@/actions/running";
import { FormMessage, type FormState } from "@/components/ui/forms";
import { Toggle } from "@/components/ui/controls";
import { ZONE_RADII } from "@/lib/running/constants";

export function HideRoutesToggle({ hidden, locked }: { hidden: boolean; locked?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(hidden);
  const [pending, start] = useTransition();
  return (
    <Toggle
      checked={on || !!locked}
      disabled={pending || locked}
      label="Hide all my routes"
      onChange={(v: boolean) => {
        setOn(v);
        start(async () => {
          await setHideRoutes(v);
          router.refresh();
        });
      }}
    />
  );
}

/** Adds a private place at the phone's current location (the coordinates are never shown back). */
export function AddZone() {
  const router = useRouter();
  const [label, setLabel] = useState("Home");
  const [radius, setRadius] = useState<number>(400);
  const [state, setState] = useState<FormState>(undefined);
  const [busy, setBusy] = useState(false);

  function add() {
    if (!("geolocation" in navigator)) return setState({ error: "This browser has no location access." });
    setBusy(true);
    setState(undefined);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await addPrivacyZone({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusM: radius, label }).catch(() => ({ error: "Couldn't save. Check your connection." }));
        setBusy(false);
        setState(res);
        if (res && "ok" in res) router.refresh();
      },
      () => {
        setBusy(false);
        setState({ error: "Allow location for Riadha to add a place where you are." });
      },
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label>
          <span className="label">Name</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} className="field" placeholder="Home, school, work…" />
        </label>
        <label>
          <span className="label">Size</span>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="field w-auto">
            {ZONE_RADII.map((r) => <option key={r} value={r}>{r} m</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={add} disabled={busy} className="btn btn-primary btn-block">
        <LocateFixed size={16} /> {busy ? "Finding you…" : "Hide where I am now"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
