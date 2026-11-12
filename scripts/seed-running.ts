/**
 * Seeds Riadha Run on top of the base seed: challenges (First 5K / 10K, this month's 5K and 10K, a
 * sub-25 5K, Jamhuri 12K, a 100 km month and a sponsored charity challenge), a few weeks of synthetic GPS
 * runs for the demo athletes and fans (through the real engine, so PRs, posts, weekly scores and
 * challenges are all genuine), a group run with its recap, and some verified times. Additive and
 * idempotent: it skips if challenges exist.
 *
 *   npm run db:seed:running
 *
 * Routes are generated shapes near real training areas; nothing here is anyone's real activity.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { createDb, type DB } from "../src/db/client";
import * as s from "../src/db/schema";
import { ingestActivity, runRunningJobs } from "../src/lib/running/engine";
import type { Sport, TrackPoint } from "../src/lib/running/track";

const DAY = 86_400_000;
let seed = 20261023;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + rand() * (b - a);

/** Nairobi midnight starting the month containing `d`, shifted by `add` months. */
function monthStart(d: Date, add = 0) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" }).format(d).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + add, 1));
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00+03:00`);
}
const monthName = (d: Date) => new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", month: "long" }).format(d);

/**
 * A believable loop: a wobbly closed curve scaled to the distance, sampled every second with the pace
 * drifting a little, a gentle elevation profile and a little GPS noise.
 */
function makeTrack(center: [number, number], km: number, secPerKm: number, opts: { hilly?: number } = {}): TrackPoint[] {
  const a1 = between(0, Math.PI * 2);
  const a2 = between(0, Math.PI * 2);
  const lobes = 2 + Math.floor(rand() * 3);
  const stretch = between(0.6, 1.4);
  const shape = (t: number) => 1 + 0.22 * Math.sin(lobes * t + a1) + 0.1 * Math.sin((lobes + 2) * t + a2);
  // The unit curve, densely sampled, with its running length.
  const N = 3000;
  const curve: [number, number][] = [];
  const cum = [0];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    curve.push([shape(t) * Math.cos(t) * stretch, shape(t) * Math.sin(t)]);
    if (i) cum.push(cum[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]));
  }
  const scale = (km * 1000) / cum[N];
  const cos = Math.cos((center[0] * Math.PI) / 180);
  const ele0 = between(1500, 2300);
  const pts: TrackPoint[] = [];
  let d = 0;
  let j = 0;
  for (let t = 0; d < km * 1000; t += 2) {
    const drift = 1 + 0.05 * Math.sin(t / 140) + 0.02 * Math.sin(t / 23);
    d = Math.min(km * 1000, d + ((1000 / secPerKm) * drift) * 2);
    while (j < N - 1 && cum[j + 1] * scale < d) j++;
    const span = (cum[j + 1] - cum[j]) * scale || 1;
    const f = Math.min(1, (d - cum[j] * scale) / span);
    const x = (curve[j][0] + (curve[j + 1][0] - curve[j][0]) * f - curve[0][0]) * scale + between(-1.5, 1.5);
    const y = (curve[j][1] + (curve[j + 1][1] - curve[j][1]) * f - curve[0][1]) * scale + between(-1.5, 1.5);
    const theta = (j / N) * Math.PI * 2;
    pts.push([center[0] + y / 111_320, center[1] + x / (111_320 * cos), t + 2, ele0 + (opts.hilly ?? 25) * Math.sin(theta * 2) + 5 * Math.sin(theta * 7)]);
    if (d >= km * 1000) break;
  }
  return pts;
}

type Plan = { handle: string; center: [number, number]; perWeek: [number, number]; km: [number, number]; pace: [number, number]; privateShare: number; sport?: Sport; hilly?: number };

const PLANS: Plan[] = [
  { handle: "faithchebet", center: [0.6704, 35.5081], perWeek: [3, 4], km: [6, 11], pace: [235, 265], privateShare: 0, hilly: 40 },
  { handle: "mercywanjiru", center: [-0.27, 36.38], perWeek: [3, 4], km: [12, 30], pace: [218, 245], privateShare: 0, hilly: 30 },
  { handle: "denniskiprop", center: [0.2039, 35.105], perWeek: [2, 3], km: [5, 9], pace: [215, 240], privateShare: 0, hilly: 35 },
  { handle: "ianochieng", center: [-0.0917, 34.768], perWeek: [1, 2], km: [25, 50], pace: [110, 140], privateShare: 0, sport: "ride" },
];
const FAN_CENTERS: Record<string, [number, number]> = {
  Nairobi: [-1.2366, 36.8362],
  Kisumu: [-0.0917, 34.768],
  Mombasa: [-4.0435, 39.6682],
  Nakuru: [-0.3031, 36.08],
  Kakamega: [0.2827, 34.7519],
  Machakos: [-1.5177, 37.2634],
  Kiambu: [-1.1714, 36.8356],
};

/** A Nairobi-time instant `daysAgo` days back at hh:mm. */
function at(daysAgo: number, hh: number, mm: number) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(Date.now() - daysAgo * DAY));
  return new Date(`${ymd}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+03:00`);
}

export async function seedRunning(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(s.challenges);
  if (n > 0) {
    console.log("Riadha Run already seeded (challenges exist). Skipping.");
    return;
  }
  // Demo accounts only (the base seed's +254700000xxx numbers): never generate activity for real sign-ups.
  const users = (await db.select().from(s.users)).filter((u) => u.phone.startsWith("+25470000"));
  const by = (h: string) => users.find((u) => u.handle === h);
  const admin = by("riadha");
  const shop = (await db.select().from(s.businesses).where(eq(s.businesses.name, "Kinetic Sports Kenya")))[0];
  const now = new Date();
  const thisMonth = monthStart(now);
  const nextMonth = monthStart(now, 1);
  const afterNext = monthStart(now, 2);
  const year = now.getFullYear();

  /* Challenges */
  const defs: (typeof s.challenges.$inferInsert)[] = [
    { slug: "first-5k", title: "First 5K", tagline: "Your first 5 km in one go. Any pace counts.", kind: "single", goalM: 5000, startsAt: new Date(`${year}-01-01T00:00:00+03:00`), endsAt: null, accent: "green", description: "Run 5 km without stopping the recording. Walk breaks are fine; the clock is not the point. Every run since 1 January counts." },
    { slug: "first-10k", title: "First 10K", tagline: "Double digits. The medal every runner remembers.", kind: "single", goalM: 10_000, startsAt: new Date(`${year}-01-01T00:00:00+03:00`), endsAt: null, accent: "cobalt" },
    { slug: `${monthName(thisMonth).toLowerCase()}-5k`, title: `${monthName(thisMonth)} 5K Challenge`, tagline: "One 5K run this month.", kind: "single", goalM: 5000, startsAt: thisMonth, endsAt: nextMonth, accent: "green" },
    { slug: `${monthName(thisMonth).toLowerCase()}-10k`, title: `${monthName(thisMonth)} 10K Challenge`, tagline: "One 10K run this month.", kind: "single", goalM: 10_000, startsAt: thisMonth, endsAt: nextMonth, accent: "cobalt" },
    { slug: `${monthName(nextMonth).toLowerCase()}-10k`, title: `${monthName(nextMonth)} 10K Challenge`, tagline: "Start the month with a 10K.", kind: "single", goalM: 10_000, startsAt: nextMonth, endsAt: afterNext, accent: "cobalt" },
    { slug: "sub-25-5k", title: "Sub-25 5K", tagline: "5 km in under 25 minutes.", kind: "single", goalM: 5000, maxMs: 25 * 60_000, startsAt: thisMonth, endsAt: afterNext, accent: "navy", description: "Your fastest 5 km inside any run counts, so a fast stretch in the middle of a long run is fine." },
    { slug: `jamhuri-12k-${year}`, title: "Jamhuri 12K", tagline: "12 km for 12 December.", kind: "single", goalM: 12_000, occasion: "Jamhuri Day", startsAt: new Date(`${year}-12-06T00:00:00+03:00`), endsAt: new Date(`${year}-12-15T00:00:00+03:00`), accent: "green", description: "Celebrate Jamhuri Day with 12 km in one run, any time between 6 and 14 December. Finishers get the Jamhuri medal on their profile." },
    { slug: `${monthName(thisMonth).toLowerCase()}-100k`, title: `${monthName(thisMonth)} 100 km`, tagline: "Add up 100 km this month.", kind: "total", goalM: 100_000, startsAt: thisMonth, endsAt: nextMonth, accent: "cobalt" },
    { slug: "shoes-for-iten", title: "Shoes for Iten", tagline: "50 km to put a junior in running shoes.", kind: "total", goalM: 50_000, startsAt: thisMonth, endsAt: afterNext, accent: "green", cause: "For every runner who finishes, Kinetic Sports Kenya donates a pair of running shoes to a junior athlete at a school in Iten.", sponsorId: shop?.id ?? null, description: "Runs and walks over the two months add up. Share your medal when you finish." },
  ];
  const challenges = await db.insert(s.challenges).values(defs.map((d) => ({ ...d, status: "live" as const, createdBy: admin?.id ?? null }))).returning();
  console.log(`Challenges: ${challenges.length}`);

  /* Runners: the demo athletes plus fans who run */
  const fans = users.filter((u) => u.role === "fan" && u.county && FAN_CENTERS[u.county] && u.handle !== "riadha").slice(0, 10);
  const plans: (Plan & { user: s.User })[] = [
    ...PLANS.flatMap((p) => (by(p.handle) ? [{ ...p, user: by(p.handle)! }] : [])),
    ...fans.map((u, i) => ({ handle: u.handle, user: u, center: FAN_CENTERS[u.county!], perWeek: [1, 3] as [number, number], km: [3, i % 3 === 0 ? 14 : 9] as [number, number], pace: [300, 420] as [number, number], privateShare: 0.6 })),
  ];

  // The group run: last Saturday 06:00 at Karura, with a few Nairobi fans in the club.
  const crew = (await db.select().from(s.communities).where(eq(s.communities.name, "Nairobi Morning Run")))[0];
  let group: typeof s.communityEvents.$inferSelect | null = null;
  let groupRunners = new Set<string>();
  const lastSat = (() => {
    for (let k = 1; k <= 7; k++) {
      const d = at(k, 6, 0);
      if (new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", weekday: "short" }).format(d) === "Sat") return k;
    }
    return 2;
  })();
  if (crew) {
    [group] = await db
      .insert(s.communityEvents)
      .values({ communityId: crew.id, title: "Saturday 10K at Karura", description: "Pace groups 4:30, 5:30 and 6:30. Coffee after at Gate A.", location: "Karura Forest, Gate A", startsAt: at(lastSat, 6, 0), endsAt: at(lastSat, 8, 0), createdBy: crew.ownerId, isGroupRun: true, lat: -1.2366, lng: 36.8362 })
      .returning();
    // Four runners (Nairobi-area fans first) join the club and turn up.
    const near = plans.filter((p) => !p.sport && p.privateShare > 0).sort((a, b) => Number(["Nairobi", "Kiambu"].includes(b.user.county ?? "")) - Number(["Nairobi", "Kiambu"].includes(a.user.county ?? "")));
    groupRunners = new Set(near.slice(0, 4).map((p) => p.user.id));
    if (groupRunners.size) await db.insert(s.communityMembers).values([...groupRunners].map((userId) => ({ communityId: crew.id, userId }))).onConflictDoNothing();
  }

  // Everyone joins a few challenges first, so their runs count as they're saved.
  const joinable = challenges.filter((c) => c.startsAt <= now);
  for (const p of plans) {
    const picks = joinable.filter((c) => p.sport === "ride" ? false : c.kind === "single" ? rand() < 0.75 : rand() < 0.5);
    if (picks.length) await db.insert(s.challengeEntries).values(picks.map((c) => ({ challengeId: c.id, userId: p.user.id, joinedAt: new Date(now.getTime() - 30 * DAY) }))).onConflictDoNothing();
  }

  let saved = 0;
  const runner = async (p: (typeof plans)[number]) => {
    for (let w = 4; w >= 0; w--) {
      const runs = Math.round(between(p.perWeek[0], p.perWeek[1]));
      for (let r = 0; r < runs; r++) {
        const daysAgo = w * 7 + Math.floor(between(0, 7));
        const startedAt = at(daysAgo, Math.floor(between(5, 7)), Math.floor(between(0, 59)));
        if (startedAt.getTime() > Date.now() - 2 * 3600_000) continue;
        const kmGoal = between(p.km[0], p.km[1]);
        const pace = between(p.pace[0], p.pace[1]) * (w === 0 && r === 0 ? 0.95 : 1);
        const res = await ingestActivity(db, p.user, {
          sport: p.sport ?? "run",
          source: rand() < 0.5 ? "recorded" : rand() < 0.5 ? "fit" : "gpx",
          startedAt: startedAt.toISOString(),
          points: makeTrack(p.center, kmGoal, pace, { hilly: p.hilly }),
          isPrivate: rand() < p.privateShare,
          device: rand() < 0.5 ? "Riadha recorder" : "Garmin Forerunner 255",
          clientId: `seed-${p.handle}-${startedAt.getTime()}`,
        });
        if (!("error" in res)) saved++;
      }
    }
    // The club members who turned up ran from the meeting point.
    if (group && groupRunners.has(p.user.id)) {
      const startedAt = new Date(group.startsAt.getTime() + between(2, 9) * 60_000);
      const res = await ingestActivity(db, p.user, { sport: "run", source: "recorded", startedAt: startedAt.toISOString(), points: makeTrack([-1.2366 + 0.0006, 36.8362 + 0.0004], between(8, 11), between(270, 400)), clientId: `seed-group-${p.handle}`, device: "Riadha recorder" });
      if (!("error" in res)) saved++;
    }
    process.stdout.write(".");
  };
  const queue = [...plans];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) await runner(p);
  }));
  console.log(`\nActivities: ${saved}`);

  /* Verified times */
  const club = (h: string) => by(h)?.id ?? null;
  const trials: (typeof s.timeTrials.$inferInsert)[] = [];
  if (by("faithchebet")) trials.push({ userId: by("faithchebet")!.id, event: "400m", ms: 53_800, date: new Date(now.getTime() - 9 * DAY).toISOString().slice(0, 10), venue: "Kamariny Stadium, Iten", verifierId: club("itentrack"), status: "approved", reviewedAt: now, note: "Club time trial, hand-timed by Coach Rono." });
  if (by("mercywanjiru")) {
    trials.push({ userId: by("mercywanjiru")!.id, event: "10k", ms: 31 * 60_000 + 12_000, date: new Date(now.getTime() - 40 * DAY).toISOString().slice(0, 10), venue: "Nyayo Stadium", verifierId: club("karuradawn"), status: "approved", reviewedAt: now });
    trials.push({ userId: by("mercywanjiru")!.id, event: "half", ms: 68 * 60_000 + 40_000, date: new Date(now.getTime() - 18 * DAY).toISOString().slice(0, 10), venue: "Nairobi road race", verifierId: club("karuradawn"), status: "pending", note: "Chip time on the results page." });
  }
  if (by("denniskiprop")) trials.push({ userId: by("denniskiprop")!.id, event: "800m", ms: 107_900, date: new Date(now.getTime() - 20 * DAY).toISOString().slice(0, 10), venue: "School nationals, Kapsabet", verifierId: club("itentrack"), status: "approved", reviewedAt: now });
  if (trials.length) await db.insert(s.timeTrials).values(trials);

  // Saving each run already scored its week and moved its challenges.
  const ids = [...new Set(plans.map((p) => p.user.id))];
  const [{ done }] = await db.select({ done: count() }).from(s.challengeEntries).where(and(inArray(s.challengeEntries.userId, ids), isNotNull(s.challengeEntries.completedAt)));
  console.log(`Challenges finished: ${done}`);

  // Last week's results post, the crew chat podium and the group-run recap.
  await runRunningJobs(db);
  console.log("Weekly results and group-run recap posted.");
}

// Run directly: `npm run db:seed:running`.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed-running.ts")) {
  const { db, client } = createDb(process.env.DATABASE_URL, 10);
  seedRunning(db)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => client.end());
}
