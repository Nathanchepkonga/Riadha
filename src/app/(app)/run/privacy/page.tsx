import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, EyeOff, MapPinOff, Scissors, ShieldCheck, Trash2 } from "lucide-react";
import { removePrivacyZone } from "@/actions/running";
import { requireUser } from "@/lib/auth/session";
import { ageFrom } from "@/lib/format";
import { privacyZonesFor } from "@/lib/running/queries";
import { AddZone, HideRoutesToggle } from "@/components/run/privacy-controls";

export const metadata: Metadata = { title: "Route privacy" };

export default async function PrivacyPage() {
  const user = await requireUser();
  const zones = await privacyZonesFor(user.id);
  const age = ageFrom(user.dateOfBirth);
  const minor = age !== null && age < 18;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/run" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Riadha Run
      </Link>
      <div>
        <p className="kicker">Your safety</p>
        <h1 className="h2">Route privacy</h1>
      </div>

      <ul className="card divide-y divide-line/70 overflow-hidden text-[14px]">
        {[
          [ShieldCheck, "No maps, ever", "Routes show as a shape on navy, never on a street map, so nobody can read your streets off it."],
          [Scissors, "Start and finish cut off", "The first and last 200 m of every route are removed, so your door isn't the end of the line."],
          [EyeOff, "Your GPS stays with Riadha", "The raw track is used to work out your numbers and is never shown to anyone, including your followers."],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <li key={title as string} className="flex gap-3 px-4 py-3">
              <I size={18} className="mt-0.5 shrink-0 text-cobalt" />
              <span>
                <span className="block font-semibold">{title as string}</span>
                <span className="text-muted">{body as string}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <section className="card p-4">
        {minor ? (
          <>
            <HideRoutesToggle hidden locked />
            <p className="mt-2 text-[13px] text-muted">Runners under 18 never show a route, only their numbers. This switches on by itself when you turn 18.</p>
          </>
        ) : (
          <>
            <HideRoutesToggle hidden={user.hideRoutes} />
            <p className="mt-2 text-[13px] text-muted">Show numbers and splits only, on every run, old ones included.</p>
          </>
        )}
      </section>

      {!minor && (
        <section className="card p-4">
          <h2 className="h5 flex items-center gap-2"><MapPinOff size={18} /> Private places</h2>
          <p className="mt-1 text-[13px] text-muted">Any part of a route inside these circles is cut out, on every run including old ones. Stand at the place and tap the button.</p>
          {zones.length > 0 && (
            <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
              {zones.map((z) => (
                <li key={z.id} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
                  <MapPinOff size={16} className="text-muted" />
                  <span className="flex-1 font-semibold">{z.label}</span>
                  <span className="text-[12px] text-muted">{z.radiusM} m</span>
                  <form action={removePrivacyZone.bind(null, z.id)}>
                    <button aria-label={`Remove ${z.label}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-gray-100 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {zones.length < 5 && (
            <div className="mt-4">
              <AddZone />
            </div>
          )}
        </section>
      )}
      <p className="pb-2 text-[12px] text-muted">Want a run gone completely? Open it and delete it, or mark it Only me.</p>
    </div>
  );
}
