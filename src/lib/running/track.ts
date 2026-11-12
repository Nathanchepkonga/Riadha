/*
 * Riadha Run: pure GPS track maths, shared by the phone (live recorder numbers, file previews) and the
 * server (the analysis that counts). Coordinates only ever live in the private track; everything public
 * is numbers, splits, best efforts and shape-only route art with the start, finish and privacy zones cut.
 */
import type { RouteArt, Splits } from "@/db/schema";

/** [latitude, longitude, seconds from the start, elevation in metres or null]. */
export type TrackPoint = [number, number, number, number | null];
export type Sport = "run" | "walk" | "ride";
export type Zone = { lat: number; lng: number; radiusM: number };
export type Flag = "vehicle" | "gps" | "impossible";

const EARTH_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Standard distances we look for inside every run (Strava calls these best efforts). */
export const EFFORTS = [
  { key: "400m", m: 400, label: "400m" },
  { key: "1k", m: 1000, label: "1K" },
  { key: "1mile", m: 1609.344, label: "1 mile" },
  { key: "5k", m: 5000, label: "5K" },
  { key: "10k", m: 10_000, label: "10K" },
  { key: "half", m: 21_097.5, label: "Half marathon" },
  { key: "marathon", m: 42_195, label: "Marathon" },
] as const;
export type EffortKey = (typeof EFFORTS)[number]["key"];
export const effortLabel = (k: string) => EFFORTS.find((e) => e.key === k)?.label ?? k;

/** A little under the world records: a GPS "best effort" faster than this is a vehicle or bad GPS. */
const FASTEST_HUMAN_MS: Record<string, number> = { "1k": 128_000, "1mile": 216_000, "5k": 735_000, "10k": 1_530_000, half: 3_360_000, marathon: 7_080_000 };

/** Above these speeds a point is a GPS jump (dropped), and sustained for a minute it's a vehicle (flagged). */
const LIMITS: Record<Sport, { spike: number; vehicle: number; moving: number }> = {
  run: { spike: 20, vehicle: 9.5, moving: 0.5 },
  walk: { spike: 20, vehicle: 7, moving: 0.4 },
  ride: { spike: 35, vehicle: 25, moving: 1 },
};

export const MAX_POINTS = 30_000;

export type Analysis = {
  /** Cleaned and thinned track, t from 0. Private. */
  points: TrackPoint[];
  distanceM: number;
  movingS: number;
  elapsedS: number;
  elevationGainM: number;
  splits: Splits;
  efforts: { key: EffortKey; ms: number }[];
  profile: { ele: number[]; pace: number[] };
  flag: Flag | null;
};

function valid(p: unknown): p is TrackPoint {
  if (!Array.isArray(p) || p.length < 3) return false;
  const [lat, lng, t, ele] = p as unknown[];
  return (
    typeof lat === "number" && typeof lng === "number" && typeof t === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(t) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) && t >= 0 &&
    (ele == null || (typeof ele === "number" && Number.isFinite(ele) && Math.abs(ele) < 9000))
  );
}

/** Distance and time along the track, with linear interpolation for "when did I pass metre X". */
function timeAt(cd: number[], t: number[], d: number, from = 0) {
  let i = from;
  while (i < cd.length - 1 && cd[i + 1] < d) i++;
  if (i >= cd.length - 1) return { t: t[t.length - 1], i };
  const span = cd[i + 1] - cd[i];
  const f = span > 0 ? (d - cd[i]) / span : 0;
  return { t: t[i] + f * (t[i + 1] - t[i]), i };
}

/** Fastest time over `m` metres anywhere in the track (two pointers, interpolated start). */
function fastestOver(cd: number[], t: number[], m: number) {
  let best = Infinity;
  let i = 0;
  for (let j = 1; j < cd.length; j++) {
    if (cd[j] < m) continue;
    while (i + 1 < j && cd[j] - cd[i + 1] >= m) i++;
    const startD = cd[j] - m;
    const span = cd[i + 1] - cd[i];
    const f = span > 0 ? Math.min(1, Math.max(0, (startD - cd[i]) / span)) : 0;
    const startT = t[i] + f * (t[i + 1] - t[i]);
    const dur = t[j] - startT;
    if (dur > 0 && dur < best) best = dur;
  }
  return best;
}

/** Fastest time over any distance (for challenges with a time target, e.g. a 12K). Null if too short. */
export function fastestTime(points: TrackPoint[], m: number) {
  const cd = cumulative(points);
  if (cd[cd.length - 1] < m) return null;
  const best = fastestOver(cd, points.map((p) => p[2]), m);
  return Number.isFinite(best) ? Math.round(best * 1000) : null;
}

function cumulative(points: TrackPoint[]) {
  const cd = [0];
  for (let k = 1; k < points.length; k++) cd.push(cd[k - 1] + haversine(points[k - 1][0], points[k - 1][1], points[k][0], points[k][1]));
  return cd;
}

/** Turns a raw track into the numbers we keep. Returns an error message for tracks we can't use. */
export function analyseTrack(raw: unknown[], sport: Sport): Analysis | { error: string } {
  if (raw.length > MAX_POINTS * 4) return { error: "That file is too large. Split very long activities into parts." };
  const sorted = raw.filter(valid).sort((a, b) => a[2] - b[2]);
  if (sorted.length < 10) return { error: "We couldn't find a GPS route in that activity." };
  const t0 = sorted[0][2];
  const lim = LIMITS[sport];

  // 1. Drop GPS jumps (impossible speed from the last good point) and repeated timestamps.
  const clean: TrackPoint[] = [[sorted[0][0], sorted[0][1], 0, sorted[0][3] ?? null]];
  let spikes = 0;
  for (let k = 1; k < sorted.length; k++) {
    const p = sorted[k];
    const prev = clean[clean.length - 1];
    const dt = p[2] - t0 - prev[2];
    if (dt <= 0) continue;
    const d = haversine(prev[0], prev[1], p[0], p[1]);
    if (d / dt > lim.spike && d > 30) {
      spikes++;
      continue;
    }
    clean.push([p[0], p[1], p[2] - t0, p[3] ?? null]);
  }
  // 2. Light smoothing (±2 neighbours within 10 s): phone GPS jitter otherwise zig-zags and adds distance.
  const smooth = clean.map((p, k): TrackPoint => {
    let la = 0;
    let ln = 0;
    let n = 0;
    for (let q = Math.max(0, k - 2); q <= Math.min(clean.length - 1, k + 2); q++) {
      if (Math.abs(clean[q][2] - p[2]) > 10) continue;
      la += clean[q][0];
      ln += clean[q][1];
      n++;
    }
    return [la / n, ln / n, p[2], p[3]];
  });
  // 3. Thin to what matters: every 3 m of movement or every 15 s.
  const pts: TrackPoint[] = [smooth[0]];
  for (let k = 1; k < smooth.length; k++) {
    const last = pts[pts.length - 1];
    const p = smooth[k];
    if (k === smooth.length - 1 || haversine(last[0], last[1], p[0], p[1]) >= 3 || p[2] - last[2] >= 15) pts.push(p);
  }
  if (pts.length > MAX_POINTS) return { error: "That activity has too many GPS points to read." };

  const cd = cumulative(pts);
  const t = pts.map((p) => p[2]);
  const distanceM = cd[cd.length - 1];
  const elapsedS = t[t.length - 1];
  if (distanceM < 100 || elapsedS < 30) return { error: "That's too short to save. Activities need at least 100 m." };
  if (elapsedS > 36 * 3600) return { error: "Activities longer than 36 hours can't be saved." };

  // 4. Moving time: segments faster than a slow walk (pauses at traffic lights don't count).
  const mt = [0];
  for (let k = 1; k < pts.length; k++) {
    const dt = t[k] - t[k - 1];
    const v = (cd[k] - cd[k - 1]) / dt;
    mt.push(mt[k - 1] + (v >= lim.moving ? dt : 0));
  }
  const movingS = mt[mt.length - 1];

  // 5. Elevation gain from smoothed altitude with a 3 m dead band (GPS altitude wobbles).
  let elevationGainM = 0;
  const withEle = pts.filter((p) => p[3] != null).length;
  const eles: number[] = [];
  if (withEle >= pts.length / 2) {
    let lastE = pts.find((p) => p[3] != null)![3]!;
    const filled = pts.map((p) => (lastE = p[3] ?? lastE));
    for (let k = 0; k < filled.length; k++) {
      const w = filled.slice(Math.max(0, k - 2), k + 3);
      eles.push(w.reduce((a, b) => a + b, 0) / w.length);
    }
    let ref = eles[0];
    for (const e of eles) {
      if (e - ref >= 3) {
        elevationGainM += e - ref;
        ref = e;
      } else if (ref - e >= 3) ref = e;
    }
  }

  // 6. Kilometre splits on moving time.
  const fullKm = Math.floor(distanceM / 1000);
  const km: number[] = [];
  let prevT = 0;
  let idx = 0;
  for (let k = 1; k <= fullKm; k++) {
    const at = timeAt(cd, mt, k * 1000, idx);
    idx = at.i;
    km.push(Math.round(at.t - prevT));
    prevT = at.t;
  }
  const restM = distanceM - fullKm * 1000;
  const splits: Splits = { km, rest: restM >= 50 ? [Math.round(restM), Math.round(movingS - prevT)] : null };

  // 7. Best efforts (runs) and the checks that keep leaderboards honest.
  let flag: Flag | null = null;
  const efforts: Analysis["efforts"] = [];
  if (sport === "run") {
    for (const e of EFFORTS) {
      if (distanceM < e.m) break;
      const s = fastestOver(cd, t, e.m);
      if (!Number.isFinite(s)) continue;
      const ms = Math.round(s * 1000);
      const floor = FASTEST_HUMAN_MS[e.key];
      if (floor && ms < floor) {
        flag = "impossible";
        continue;
      }
      if (e.key === "400m" && ms < 43_000) continue; // GPS noise over one lap
      efforts.push({ key: e.key, ms });
    }
  }
  // A vehicle: faster than the sport allows for a sustained minute.
  let i = 0;
  for (let j = 1; j < pts.length && flag !== "vehicle"; j++) {
    while (i < j && t[j] - t[i + 1] >= 60) i++;
    const dt = t[j] - t[i];
    if (dt >= 60 && (cd[j] - cd[i]) / dt > lim.vehicle) flag = "vehicle";
  }
  if (!flag && spikes > Math.max(8, sorted.length * 0.05)) flag = "gps";
  if (flag) efforts.length = 0;

  // 8. 60-sample profile for the card, the chart and the reel.
  const N = 60;
  const ele: number[] = [];
  const pace: number[] = [];
  const half = Math.max(100, distanceM / N);
  for (let s = 0; s < N; s++) {
    const d = (distanceM * (s + 0.5)) / N;
    const a = timeAt(cd, mt, Math.max(0, d - half));
    const b = timeAt(cd, mt, Math.min(distanceM, d + half));
    const span = Math.min(distanceM, d + half) - Math.max(0, d - half);
    pace.push(Math.round(Math.min(1800, Math.max(100, ((b.t - a.t) / span) * 1000))));
    if (eles.length) {
      const k = timeAt(cd, cd, d).i;
      ele.push(Math.round(eles[Math.min(k, eles.length - 1)]));
    }
  }

  return {
    points: pts.map((p) => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6, Math.round(p[2] * 10) / 10, p[3] == null ? null : Math.round(p[3] * 10) / 10]),
    distanceM: Math.round(distanceM),
    movingS: Math.round(movingS),
    elapsedS: Math.round(elapsedS),
    elevationGainM: Math.round(elevationGainM),
    splits,
    efforts,
    profile: { ele, pace },
    flag,
  };
}

/** Ramer–Douglas–Peucker on flat [x, y] pairs. */
function simplify(xs: number[], ys: number[], eps: number) {
  const keep = new Uint8Array(xs.length);
  keep[0] = keep[xs.length - 1] = 1;
  const stack: [number, number][] = [[0, xs.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let at = -1;
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const len = Math.hypot(dx, dy) || 1;
    for (let k = a + 1; k < b; k++) {
      const dist = Math.abs(dy * xs[k] - dx * ys[k] + xs[b] * ys[a] - ys[b] * xs[a]) / len;
      if (dist > worst) {
        worst = dist;
        at = k;
      }
    }
    if (worst > eps && at > 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return [...keep.keys()].filter((k) => keep[k]);
}

/**
 * The public route: the first and last 200 m (or 15% of short routes) and every privacy zone are cut out,
 * then the shape is projected, scaled into a 1000-unit box and simplified. No coordinates survive.
 */
export function routeArt(points: TrackPoint[], zones: Zone[] = []): RouteArt | null {
  if (points.length < 2) return null;
  const cd = cumulative(points);
  const total = cd[cd.length - 1];
  const trim = Math.min(200, total * 0.15);
  const segs: TrackPoint[][] = [];
  let cur: TrackPoint[] = [];
  points.forEach((p, k) => {
    const hidden = cd[k] < trim || cd[k] > total - trim || zones.some((z) => haversine(z.lat, z.lng, p[0], p[1]) < z.radiusM);
    if (hidden) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    } else cur.push(p);
  });
  if (cur.length > 1) segs.push(cur);
  if (!segs.length) return null;

  const all = segs.flat();
  const lat0 = all.reduce((a, p) => a + p[0], 0) / all.length;
  const lng0 = all.reduce((a, p) => a + p[1], 0) / all.length;
  const cos = Math.cos(rad(lat0));
  const proj = (p: TrackPoint) => [rad(p[1] - lng0) * cos * EARTH_M, -rad(p[0] - lat0) * EARTH_M] as const;
  const xy = all.map(proj);
  const minX = Math.min(...xy.map((p) => p[0]));
  const maxX = Math.max(...xy.map((p) => p[0]));
  const minY = Math.min(...xy.map((p) => p[1]));
  const maxY = Math.max(...xy.map((p) => p[1]));
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const scale = 1000 / span;
  const v: [number, number] = [Math.max(1, Math.round((maxX - minX) * scale)), Math.max(1, Math.round((maxY - minY) * scale))];

  const out = segs
    .map((seg) => {
      const xs = seg.map((p) => (proj(p)[0] - minX) * scale);
      const ys = seg.map((p) => (proj(p)[1] - minY) * scale);
      const flat: number[] = [];
      for (const k of simplify(xs, ys, 2)) flat.push(Math.round(xs[k]), Math.round(ys[k]));
      return flat;
    })
    .filter((f) => f.length >= 4);
  return out.length ? { v, s: out } : null;
}

/** Monday 00:00 in Nairobi (UTC+3, no daylight saving) of the week containing `d`, as YYYY-MM-DD. */
export function weekStartOf(d: Date) {
  const local = new Date(d.getTime() + 3 * 3600_000);
  const back = (local.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back));
  return monday.toISOString().slice(0, 10);
}

/** The instants a Nairobi week starts and ends. */
export function weekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00+03:00`);
  return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
}

export function addWeeks(weekStart: string, n: number) {
  return new Date(new Date(`${weekStart}T12:00:00Z`).getTime() + n * 7 * 86_400_000).toISOString().slice(0, 10);
}
