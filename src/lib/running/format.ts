/* Number formatting for Riadha Run (shared by server and client). */

export const SPORT_LABEL = { run: "Run", walk: "Walk", ride: "Ride" } as const;

/** 10234 → "10.23" (two decimals under 10 km, one above). */
export function km(m: number) {
  const v = m / 1000;
  return v < 10 ? v.toFixed(2) : v.toFixed(1);
}

/** 3725 → "1:02:05", 645 → "10:45". */
export function duration(s: number) {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Seconds per km → "4:32". */
export function pace(secPerKm: number) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "–";
  const t = Math.round(secPerKm);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export const paceOf = (distanceM: number, movingS: number) => (distanceM > 0 ? (movingS / distanceM) * 1000 : 0);

/** Rides show speed instead of pace. */
export function speedKmh(distanceM: number, movingS: number) {
  return movingS > 0 ? ((distanceM / movingS) * 3.6).toFixed(1) : "0.0";
}

/** The headline pace or speed for an activity, with its unit. */
export function paceOrSpeed(sport: string, distanceM: number, movingS: number) {
  return sport === "ride" ? { value: speedKmh(distanceM, movingS), unit: "km/h", label: "Speed" } : { value: pace(paceOf(distanceM, movingS)), unit: "/km", label: "Pace" };
}

/** Race times: 53800 → "53.80", 107900 → "1:47.90", 1872000 → "31:12", 4120000 → "1:08:40". */
export function raceTime(ms: number) {
  const totalS = ms / 1000;
  if (totalS < 60) return `${totalS.toFixed(2)}`;
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  const hundredths = Math.round((s % 1) * 100);
  const sec = hundredths ? s.toFixed(2).padStart(5, "0") : String(Math.floor(s)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}` : `${m}:${sec}`;
}

/** Parses "53.8", "1:47.9", "31:12", "1:08:40" into milliseconds; null if it isn't a time. */
export function parseRaceTime(raw: string) {
  const v = raw.trim().replace(/[hms]/gi, "");
  if (!/^\d{1,3}(:\d{1,2}){0,2}(\.\d{1,3})?$/.test(v)) return null;
  const parts = v.split(":");
  let s = 0;
  for (const p of parts) s = s * 60 + Number(p);
  if (parts.slice(1).some((p) => Number(p) >= 60)) return null;
  return s > 0 ? Math.round(s * 1000) : null;
}

/** A Run League row's distance: on foot, or the ride distance for people who only rode. */
export function weekDistance(w: { runM: number; walkM: number; rideM: number }) {
  const foot = w.runM + w.walkM;
  return foot || !w.rideM ? `${km(foot)} km` : `${km(w.rideM)} km ride`;
}

/** "Morning Run", "Evening Ride"… from the Nairobi hour of the start. */
export function defaultTitle(sport: string, startedAt: Date) {
  const h = Number(new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", hour12: false }).format(startedAt));
  const part = h < 5 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  return `${part} ${SPORT_LABEL[sport as keyof typeof SPORT_LABEL] ?? "Run"}`;
}
