/**
 * Seeds Riadha with illustrative data: KPL clubs, a player pool, a full fixture list with six
 * simulated gameweeks, demo athletes / clubs / scouts / managers, posts and leagues.
 *
 *   npm run db:seed            – seed an empty database
 *   npm run db:seed -- --reset – wipe all app tables first
 *
 * Names are illustrative. Real player data needs a licence from the league or a data provider.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { count, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as s from "../src/db/schema";
import { recalculateGameweek, saveFixtureResult, type StatInput } from "../src/lib/fantasy/engine";
import { BUDGET, MAX_PER_CLUB, SQUAD_SHAPE, defaultLineup, validateSquad, type Pos } from "../src/lib/fantasy/rules";
import { seedModules } from "./seed-modules";

const { db, client } = createDb(process.env.DATABASE_URL, 3);

/* ───────── deterministic randomness ───────── */
let seed = 20260926;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}
function weighted<T>(items: T[], weight: (t: T) => number) {
  const total = items.reduce((sum, i) => sum + weight(i), 0);
  let r = rand() * total;
  for (const i of items) {
    r -= weight(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

/* ───────── reference data ───────── */
const CLUBS: { name: string; short: string; city: string; c1: string; c2: string; str: number }[] = [
  { name: "Gor Mahia", short: "GOR", city: "Nairobi", c1: "#0B8A3E", c2: "#FFFFFF", str: 1.35 },
  { name: "AFC Leopards", short: "AFC", city: "Nairobi", c1: "#1D4FB8", c2: "#FFFFFF", str: 1.2 },
  { name: "Tusker FC", short: "TUS", city: "Nairobi", c1: "#F2C200", c2: "#111111", str: 1.25 },
  { name: "Kenya Police FC", short: "POL", city: "Nairobi", c1: "#0E2A6B", c2: "#F2C200", str: 1.3 },
  { name: "KCB FC", short: "KCB", city: "Nairobi", c1: "#6BBE45", c2: "#0E3A24", str: 1.15 },
  { name: "Kakamega Homeboyz", short: "HOM", city: "Kakamega", c1: "#E86A12", c2: "#111111", str: 1.05 },
  { name: "Shabana FC", short: "SHA", city: "Kisii", c1: "#C8102E", c2: "#FFFFFF", str: 1.0 },
  { name: "Bandari FC", short: "BAN", city: "Mombasa", c1: "#1AA3D9", c2: "#FFFFFF", str: 1.0 },
  { name: "Kariobangi Sharks", short: "SHK", city: "Nairobi", c1: "#F28C28", c2: "#1A1A1A", str: 0.95 },
  { name: "Nairobi City Stars", short: "NCS", city: "Nairobi", c1: "#6A2C91", c2: "#F2C200", str: 0.9 },
  { name: "Posta Rangers", short: "POS", city: "Nairobi", c1: "#D7141A", c2: "#1A1A1A", str: 0.9 },
  { name: "Ulinzi Stars", short: "ULI", city: "Nakuru", c1: "#2E5E2E", c2: "#F2C200", str: 1.0 },
  { name: "Murang'a SEAL", short: "SEA", city: "Murang'a", c1: "#1B1B1B", c2: "#E3B505", str: 0.85 },
  { name: "Sofapaka", short: "SOF", city: "Nairobi", c1: "#F5C230", c2: "#0B3D91", str: 0.85 },
  { name: "Mathare United", short: "MAT", city: "Nairobi", c1: "#E4002B", c2: "#F2C200", str: 0.85 },
  { name: "Bidco United", short: "BID", city: "Thika", c1: "#004F9F", c2: "#FFFFFF", str: 0.8 },
  { name: "Talanta FC", short: "TAL", city: "Nairobi", c1: "#009B77", c2: "#FFFFFF", str: 0.8 },
  { name: "APS Bomet", short: "APS", city: "Bomet", c1: "#7A1F2B", c2: "#FFFFFF", str: 0.8 },
];

const FIRST = [
  "Brian", "Kevin", "Dennis", "Collins", "Victor", "Eric", "Felix", "Kennedy", "Duncan", "Michael",
  "Joseph", "Samuel", "Peter", "John", "David", "Daniel", "George", "Moses", "Ian", "Clinton",
  "Anthony", "Alfred", "Timothy", "Elvis", "Boniface", "Musa", "Hassan", "Omar", "Ibrahim", "Benson",
  "Cliff", "Patrick", "Geoffrey", "Lawrence", "Vincent", "Harrison", "Evans", "Nelson", "Wycliffe", "Austin",
];
const LAST = [
  "Otieno", "Odhiambo", "Ochieng", "Omondi", "Onyango", "Owino", "Okoth", "Wafula", "Wanyama", "Barasa",
  "Wekesa", "Simiyu", "Mutua", "Musyoka", "Kilonzo", "Kamau", "Njoroge", "Mwangi", "Kariuki", "Gitau",
  "Chege", "Kiprono", "Kiprotich", "Cheruiyot", "Kipchumba", "Rotich", "Langat", "Korir", "Juma", "Hamisi",
  "Salim", "Makori", "Nyamweya", "Ongeri", "Mokaya", "Ekiru", "Lokwawi", "Mohamed", "Abdi", "Masika",
];

const PRICE_RANGE: Record<Pos, [number, number]> = { GK: [40, 55], DEF: [40, 65], MID: [45, 100], FWD: [50, 115] };

const EAT = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** Next Saturday 13:30 EAT at least two hours away: the deadline of the upcoming gameweek. */
function upcomingDeadline(now = new Date()) {
  const eatNow = new Date(now.getTime() + EAT);
  const d = new Date(Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate(), 13, 30));
  const daysToSat = (6 - d.getUTCDay() + 7) % 7;
  let deadline = new Date(d.getTime() + daysToSat * DAY - EAT);
  if (deadline.getTime() - now.getTime() < 2 * 60 * 60 * 1000) deadline = new Date(deadline.getTime() + 7 * DAY);
  return deadline;
}

/** Double round-robin via the circle method: 34 rounds of 9 matches for 18 clubs. */
function roundRobin(ids: number[]) {
  const n = ids.length;
  const rot = [...ids];
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    rot.splice(1, 0, rot.pop()!);
  }
  return [...rounds, ...rounds.map((round) => round.map(([h, a]) => [a, h] as [number, number]))];
}

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ n }] = await db.select({ n: count() }).from(s.users);
  if (n > 0 && !reset) {
    console.log(`Database already has ${n} users. Run with --reset to wipe and reseed.`);
    return;
  }
  if (reset) {
    console.log("Wiping app tables…");
    await db.execute(sql`TRUNCATE TABLE
      ad_events, ad_campaigns, businesses, event_rsvps, community_events, community_messages,
      community_members, communities, scout_bookmarks, post_comments,
      league_members, leagues, entry_gameweeks, transfers, entry_picks, fantasy_entries,
      player_stats, fixtures, gameweeks, players, contact_requests, verification_requests,
      post_likes, posts, follows, athlete_stats, otp_codes, users, kpl_clubs
      RESTART IDENTITY CASCADE`);
  }

  /* clubs & players */
  const clubRows = await db
    .insert(s.kplClubs)
    .values(CLUBS.map((c) => ({ name: c.name, shortName: c.short, city: c.city, primaryColor: c.c1, secondaryColor: c.c2 })))
    .returning();
  const strength = new Map(clubRows.map((c, i) => [c.id, CLUBS[i].str]));

  const usedNames = new Set<string>();
  const playerValues: (typeof s.players.$inferInsert)[] = [];
  for (const club of clubRows) {
    const str = strength.get(club.id)!;
    for (const pos of ["GK", "DEF", "MID", "FWD"] as Pos[]) {
      for (let i = 0; i < SQUAD_SHAPE[pos]; i++) {
        let name = "";
        do name = `${pick(FIRST)} ${pick(LAST)}`;
        while (usedNames.has(name));
        usedNames.add(name);
        const [lo, hi] = PRICE_RANGE[pos];
        const tier = 1 - i / SQUAD_SHAPE[pos]; // first-choice players cost more
        const raw = lo + (hi - lo) * (0.25 * rand() + 0.45 * tier * (str - 0.6) + 0.1);
        playerValues.push({ clubId: club.id, name, position: pos, price: Math.max(lo, Math.min(hi, Math.round(raw / 5) * 5)) });
      }
    }
  }
  const playerRows = await db.insert(s.players).values(playerValues).returning();
  console.log(`${clubRows.length} clubs, ${playerRows.length} players`);

  /* gameweeks & fixtures — six already played, the seventh is next */
  const NEXT_GW = 7;
  const nextDeadline = upcomingDeadline();
  const rounds = roundRobin(shuffle(clubRows.map((c) => c.id)));
  const gwValues = rounds.map((_, i) => {
    const gw = i + 1;
    return {
      id: gw,
      name: `Gameweek ${gw}`,
      deadline: new Date(nextDeadline.getTime() + (gw - NEXT_GW) * 7 * DAY),
      finished: gw < NEXT_GW,
    };
  });
  await db.insert(s.gameweeks).values(gwValues);
  const fixtureValues = rounds.flatMap((round, i) => {
    const deadline = gwValues[i].deadline.getTime();
    return round.map(([home, away], j) => ({
      gameweekId: i + 1,
      homeClubId: home,
      awayClubId: away,
      // Five games Saturday 15:00 EAT, four on Sunday.
      kickoff: new Date(deadline + 90 * 60 * 1000 + (j < 5 ? 0 : DAY) + (j % 5 === 4 ? 2 * 60 * 60 * 1000 : 0)),
    }));
  });
  const fixtureRows = await db.insert(s.fixtures).values(fixtureValues).returning();
  console.log(`${gwValues.length} gameweeks, ${fixtureRows.length} fixtures`);

  /* simulate played gameweeks */
  const byClub = new Map<number, typeof playerRows>();
  for (const p of playerRows) {
    if (!byClub.has(p.clubId)) byClub.set(p.clubId, []);
    byClub.get(p.clubId)!.push(p);
  }
  const clubPos = (clubId: number, pos: Pos) => byClub.get(clubId)!.filter((p) => p.position === pos);

  function teamSheet(clubId: number) {
    const gk = clubPos(clubId, "GK");
    const starters = [
      rand() < 0.9 ? gk[0] : gk[1],
      ...shuffle(clubPos(clubId, "DEF").slice(0, 4)).slice(0, rand() < 0.8 ? 4 : 3),
      ...clubPos(clubId, "MID").slice(0, 4),
      ...clubPos(clubId, "FWD").slice(0, 2),
    ];
    const outfieldLeft = byClub.get(clubId)!.filter((p) => p.position !== "GK" && !starters.includes(p));
    while (starters.length < 11) starters.push(outfieldLeft.shift()!);
    const subs = shuffle(outfieldLeft).slice(0, int(1, 3));
    const minutes = new Map<number, number>();
    for (const p of starters) minutes.set(p.id, 90);
    subs.forEach((sub, i) => {
      const off = starters.filter((p) => p.position !== "GK")[9 - i];
      const m = int(60, 85);
      minutes.set(off.id, m);
      minutes.set(sub.id, 90 - m);
    });
    return minutes;
  }

  for (const fx of fixtureRows.filter((f) => f.gameweekId < NEXT_GW)) {
    const sh = strength.get(fx.homeClubId)!;
    const sa = strength.get(fx.awayClubId)!;
    const homeGoals = poisson(1.35 * (sh / sa));
    const awayGoals = poisson(1.0 * (sa / sh));
    const lines = new Map<number, StatInput>();
    const sheets = [
      { clubId: fx.homeClubId, goals: homeGoals, minutes: teamSheet(fx.homeClubId), against: awayGoals },
      { clubId: fx.awayClubId, goals: awayGoals, minutes: teamSheet(fx.awayClubId), against: homeGoals },
    ];
    for (const side of sheets) {
      for (const [playerId, minutes] of side.minutes) {
        lines.set(playerId, {
          playerId, minutes, goals: 0, assists: 0, saves: 0, penSaved: 0, penMissed: 0,
          yellow: rand() < 0.1 ? 1 : 0, red: rand() < 0.008 ? 1 : 0, ownGoals: 0,
        });
      }
      const onPitch = byClub.get(side.clubId)!.filter((p) => side.minutes.has(p.id));
      for (let g = 0; g < side.goals; g++) {
        const scorer = weighted(onPitch, (p) => ({ GK: 0, DEF: 1, MID: 3, FWD: 6 })[p.position] * side.minutes.get(p.id)!);
        lines.get(scorer.id)!.goals++;
        if (rand() < 0.75) {
          const others = onPitch.filter((p) => p.id !== scorer.id);
          const assister = weighted(others, (p) => ({ GK: 0.1, DEF: 1.5, MID: 4, FWD: 2 })[p.position] * side.minutes.get(p.id)!);
          lines.get(assister.id)!.assists++;
        }
      }
      const keeper = onPitch.find((p) => p.position === "GK")!;
      lines.get(keeper.id)!.saves = poisson(2.6);
      if (rand() < 0.04) lines.get(keeper.id)!.penSaved = 1;
      if (rand() < 0.04) lines.get(pick(onPitch.filter((p) => p.position === "FWD" || p.position === "MID")).id)!.penMissed = 1;
    }
    await saveFixtureResult(
      db,
      fx.id,
      { homeScore: homeGoals, awayScore: awayGoals, finished: true, rows: [...lines.values()] },
      { recalculate: false },
    );
  }
  console.log("Simulated gameweeks 1–6");

  /* people */
  const ADMIN = { phone: "+254700000001", handle: "riadha", displayName: "Riadha Team", isAdmin: true, onboarded: true, role: "fan" as const };
  const clubId = (short: string) => clubRows.find((c) => c.shortName === short)!.id;
  const today = new Date();
  const dob = (age: number, month = 3) => `${today.getFullYear() - age}-${String(month).padStart(2, "0")}-14`;

  type Person = typeof s.users.$inferInsert & {
    stats?: { label: string; value: string; context?: string; verifiedByClub?: boolean }[];
    posts?: { body: string; statLabel?: string; statValue?: string; location?: string; daysAgo: number }[];
  };
  const athletes: Person[] = [
    {
      phone: "+254700000101", handle: "faithchebet", displayName: "Faith Chebet", role: "athlete", verified: true,
      sport: "Athletics", position: "400m sprinter", county: "Elgeyo-Marakwet", dateOfBirth: dob(22, 5),
      quote: "Every lap at altitude is a lap closer to the Olympic final.",
      tagline: "I'm more than a sprinter.",
      bio: "400m runner training in Iten with Iten Track Club. Kenyan U23 relay squad.",
      stats: [
        { label: "400m", value: "53.8s", context: "Personal best · 2026", verifiedByClub: true },
        { label: "200m", value: "24.1s", context: "Season best", verifiedByClub: true },
        { label: "4×400m", value: "3:31.2", context: "National U23 relay" },
      ],
      posts: [
        { body: "Time trial at Kamariny this morning. New PB 🔥 Scouts, DMs open via my club.", statLabel: "400m", statValue: "53.8s", location: "Kamariny Stadium, Iten", daysAgo: 1 },
        { body: "Hill repeats at 2,400m. The legs are talking but the clock is listening.", statLabel: "Hill reps", statValue: "10×300m", location: "Iten", daysAgo: 6 },
        { body: "Relay camp done. Proud to wear the colours again.", statLabel: "4×400m", statValue: "3:31.2", location: "Nyayo Stadium", daysAgo: 15 },
      ],
    },
    {
      phone: "+254700000102", handle: "brianwekesa", displayName: "Brian Wekesa", role: "athlete", verified: true,
      sport: "Football", position: "Right winger", county: "Kakamega", dateOfBirth: dob(21, 8), kplClubId: clubId("HOM"),
      quote: "Bukhungu taught me everything. The rest of the world is next.",
      tagline: "I'm more than a football player.",
      bio: "Left-footed right winger. Kakamega Homeboyz. Pace, dribbling, and a lot of hunger.",
      stats: [
        { label: "Goals", value: "7", context: "KPL 2026/27", verifiedByClub: true },
        { label: "Assists", value: "5", context: "KPL 2026/27", verifiedByClub: true },
        { label: "Minutes", value: "1,280", context: "KPL 2026/27", verifiedByClub: true },
        { label: "Top speed", value: "34.1 km/h", context: "GPS vest" },
      ],
      posts: [
        { body: "Brace on Sunday. Three points for the Homeboyz faithful 💚", statLabel: "Goals", statValue: "2", location: "Bukhungu Stadium", daysAgo: 2 },
        { body: "Extra work after training. Weak foot today.", location: "Kakamega", daysAgo: 8 },
        { body: "Assist of the week? You decide.", statLabel: "Assists", statValue: "1", location: "Kasarani", daysAgo: 13 },
      ],
    },
    {
      phone: "+254700000103", handle: "mercywanjiru", displayName: "Mercy Wanjiru", role: "athlete", verified: true,
      sport: "Athletics", position: "10,000m / half marathon", county: "Nyandarua", dateOfBirth: dob(26, 1),
      quote: "Distance is just patience you can measure.",
      tagline: "I'm more than a distance runner.",
      bio: "Long-distance runner from Ol Kalou. Road and track.",
      stats: [
        { label: "10,000m", value: "31:12", context: "Personal best", verifiedByClub: true },
        { label: "Half marathon", value: "1:08:40", context: "Personal best" },
      ],
      posts: [
        { body: "32K long run done before sunrise. Coffee earned ☕", statLabel: "Long run", statValue: "32K", location: "Ol Kalou", daysAgo: 3 },
        { body: "Half marathon PB! Thank you Karura Dawn pacers.", statLabel: "Half marathon", statValue: "1:08:40", location: "Nairobi", daysAgo: 18 },
      ],
    },
    {
      phone: "+254700000104", handle: "aminahassan", displayName: "Amina Hassan", role: "athlete", verified: false,
      sport: "Basketball", position: "Point guard", county: "Mombasa", dateOfBirth: dob(20, 11),
      quote: "See the floor before the floor sees you.",
      tagline: "I'm more than a point guard.",
      bio: "Point guard. Coast basketball. Looking for a college programme abroad.",
      stats: [
        { label: "Points / game", value: "18.4", context: "League season" },
        { label: "Assists / game", value: "7.2", context: "League season" },
      ],
      posts: [
        { body: "Triple-double in the derby. Coast to coast 🏀", statLabel: "PTS · REB · AST", statValue: "21·11·10", location: "Mombasa Sports Club", daysAgo: 4 },
      ],
    },
    {
      phone: "+254700000105", handle: "denniskiprop", displayName: "Dennis Kiprop", role: "athlete", verified: true,
      sport: "Athletics", position: "800m", county: "Nandi", dateOfBirth: dob(16, 2), guardianPhone: "+254700000199",
      quote: "Two laps. No excuses.",
      tagline: "I'm more than an 800m runner.",
      bio: "Student-athlete, Kapsabet. Guardian-managed account.",
      stats: [{ label: "800m", value: "1:47.9", context: "School nationals", verifiedByClub: true }],
      posts: [
        { body: "School nationals gold 🥇 Thank you coach and my parents.", statLabel: "800m", statValue: "1:47.9", location: "Kapsabet", daysAgo: 9 },
      ],
    },
    {
      phone: "+254700000106", handle: "graceakinyi", displayName: "Grace Akinyi", role: "athlete", verified: true,
      sport: "Football", position: "Striker", county: "Kisumu", dateOfBirth: dob(23, 7),
      quote: "Give me half a chance and I'll give you a goal.",
      tagline: "I'm more than a striker.",
      bio: "Striker in the Women's Premier League. Harambee Starlets call-up 2026.",
      stats: [
        { label: "Goals", value: "14", context: "WPL season", verifiedByClub: true },
        { label: "Caps", value: "3", context: "Harambee Starlets" },
      ],
      posts: [
        { body: "Hat-trick 🎩 and top of the scoring chart.", statLabel: "Goals", statValue: "3", location: "Moi Stadium, Kisumu", daysAgo: 5 },
      ],
    },
    {
      phone: "+254700000107", handle: "collinsmutua", displayName: "Collins Mutua", role: "athlete", verified: false,
      sport: "Boxing", position: "Middleweight", county: "Nairobi", dateOfBirth: dob(25, 10),
      quote: "The gym in Kariobangi never lies to you.",
      tagline: "I'm more than a boxer.",
      bio: "Middleweight. 12 wins, 8 by knockout.",
      stats: [
        { label: "Record", value: "12–1", context: "Amateur" },
        { label: "KOs", value: "8", context: "Amateur" },
      ],
      posts: [{ body: "Sparring day. Fight camp starts Monday.", location: "Kariobangi", daysAgo: 7 }],
    },
    {
      phone: "+254700000108", handle: "ianochieng", displayName: "Ian Ochieng", role: "athlete", verified: true,
      sport: "Rugby", position: "Winger (7s)", county: "Nairobi", dateOfBirth: dob(24, 4),
      quote: "Find the gap, then find another gear.",
      tagline: "I'm more than a rugby player.",
      bio: "Sevens winger. Speed and footwork.",
      stats: [
        { label: "Tries", value: "22", context: "National 7s circuit", verifiedByClub: true },
        { label: "40m sprint", value: "4.61s", context: "Combine" },
      ],
      posts: [{ body: "Four tries at the Safari 7s warm-up 🏉", statLabel: "Tries", statValue: "4", location: "RFUEA Ground", daysAgo: 11 }],
    },
  ];
  const clubs: Person[] = [
    {
      phone: "+254700000201", handle: "karuradawn", displayName: "Karura Dawn Runners", role: "club", verified: true,
      sport: "Running", county: "Nairobi", quote: "Sunday long runs, 6:00am, Gate A.", tagline: "More than a running club.",
      bio: "1,842 members. Pace groups from 4:30 to 7:00 per km.",
      posts: [
        { body: "Sunday long run: 21K, pace groups A & B. Bring water, the Karura taps were off last week.", statLabel: "Long run", statValue: "21K", location: "Karura Forest, Gate A", daysAgo: 0 },
        { body: "Record turnout this weekend. 150 runners 🙌", statLabel: "Runners", statValue: "150", location: "Karura Forest", daysAgo: 7 },
      ],
    },
    {
      phone: "+254700000202", handle: "itentrack", displayName: "Iten Track Club", role: "club", verified: true,
      sport: "Athletics", county: "Elgeyo-Marakwet", quote: "Home of Champions.", tagline: "More than a track club.",
      bio: "High-altitude training group in Iten. Sprint and middle-distance.",
      posts: [{ body: "Congratulations Faith on the 400m PB, verified by the club ✅", statLabel: "400m", statValue: "53.8s", location: "Iten", daysAgo: 1 }],
    },
    {
      phone: "+254700000203", handle: "bukhunguacademy", displayName: "Bukhungu Football Academy", role: "club", verified: false,
      sport: "Football", county: "Kakamega", bio: "U13–U19 football academy. Trials every first Saturday.",
    },
  ];
  const scouts: Person[] = [
    { phone: "+254700000301", handle: "amanisports", displayName: "Amani Sports Agency", role: "scout", verified: true, county: "Nairobi", bio: "Licensed football agency. East Africa to Europe." },
    { phone: "+254700000302", handle: "lenafischer", displayName: "Lena Fischer", role: "scout", verified: true, bio: "Talent scout, Hamburg. Middle-distance athletics." },
  ];
  const fans: Person[] = Array.from({ length: 36 }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    return {
      phone: `+2547000004${String(i).padStart(2, "0")}`,
      handle: `${first}${last}${i}`.toLowerCase(),
      displayName: `${first} ${last}`,
      role: "fan" as const,
      county: pick(["Nairobi", "Kisumu", "Mombasa", "Kakamega", "Nakuru", "Eldoret", "Machakos", "Kiambu"]),
      kplClubId: pick(clubRows).id,
    };
  });

  const everyone = [ADMIN as Person, ...athletes, ...clubs, ...scouts, ...fans];
  const withoutExtras = (p: Person): typeof s.users.$inferInsert => {
    const u = { ...p };
    delete u.stats;
    delete u.posts;
    return u;
  };
  const userRows = await db
    .insert(s.users)
    .values(everyone.map((p) => ({ onboarded: true, ...withoutExtras(p) })))
    .returning();
  const userId = (handle: string) => userRows.find((u) => u.handle === handle)!.id;
  console.log(`${userRows.length} users`);

  for (const p of [...athletes, ...clubs]) {
    if (p.stats?.length) {
      await db.insert(s.athleteStats).values(p.stats.map((st, i) => ({ ...st, userId: userId(p.handle), sortOrder: i })));
    }
    if (p.posts?.length) {
      await db.insert(s.posts).values(
        p.posts.map((post) => ({
          authorId: userId(p.handle),
          body: post.body,
          statLabel: post.statLabel,
          statValue: post.statValue,
          location: post.location,
          createdAt: new Date(Date.now() - post.daysAgo * DAY - int(1, 12) * 60 * 60 * 1000),
        })),
      );
    }
  }

  // Follows and likes
  const creators = userRows.filter((u) => u.role === "athlete" || u.role === "club");
  const followValues = userRows
    .filter((u) => u.role === "fan" || u.role === "scout")
    .flatMap((u) => shuffle(creators).slice(0, int(2, 6)).map((c) => ({ followerId: u.id, followeeId: c.id })));
  await db.insert(s.follows).values(followValues).onConflictDoNothing();
  const postRows = await db.select({ id: s.posts.id }).from(s.posts);
  const likeValues = postRows.flatMap((p) =>
    shuffle(userRows).slice(0, int(3, 30)).map((u) => ({ postId: p.id, userId: u.id })),
  );
  await db.insert(s.postLikes).values(likeValues).onConflictDoNothing();

  // Verification history
  await db.insert(s.verificationRequests).values([
    { userId: userId("aminahassan"), type: "athlete", legalName: "Amina Hassan Ali", organisation: "Coast Basketball League", details: "League registration and national ID ready to share.", status: "pending" },
    { userId: userId("bukhunguacademy"), type: "club", legalName: "Bukhungu Football Academy", organisation: "FKF Kakamega Branch", details: "Registered with FKF Kakamega branch in 2023.", status: "pending" },
    { userId: userId("faithchebet"), type: "athlete", legalName: "Faith Chebet", organisation: "Iten Track Club", status: "approved", reviewedAt: new Date() },
  ]);
  await db.insert(s.contactRequests).values([
    { athleteId: userId("brianwekesa"), fromUserId: userId("amanisports"), firstName: "Amani", lastName: "Sports", email: "scouting@amanisports.example", message: "We'd like to invite you to a trial in November. Please share your availability via your club." },
    { athleteId: userId("faithchebet"), fromUserId: userId("lenafischer"), firstName: "Lena", lastName: "Fischer", email: "lena@example.com", message: "Impressive 400m progression. Interested in a European indoor season?" },
  ]);

  /* fantasy managers */
  function randomSquad(pool: typeof playerRows) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const squad: typeof playerRows = [];
      const perClub = new Map<number, number>();
      let ok = true;
      for (const pos of ["GK", "DEF", "MID", "FWD"] as Pos[]) {
        const options = shuffle(pool.filter((p) => p.position === pos));
        let need = SQUAD_SHAPE[pos];
        for (const p of options) {
          if (need === 0) break;
          if ((perClub.get(p.clubId) ?? 0) >= MAX_PER_CLUB) continue;
          squad.push(p);
          perClub.set(p.clubId, (perClub.get(p.clubId) ?? 0) + 1);
          need--;
        }
        if (need > 0) ok = false;
      }
      if (ok && validateSquad(squad) === null) return squad;
    }
    throw new Error("Could not build a squad");
  }

  const TEAM_NAMES = [
    "Mashemeji FC", "Kisumu Kings", "Githeri Galácticos", "Matatu Mafia", "Nyama Choma XI", "Chapati United",
    "Sukuma Strikers", "Boda Boda Ballers", "Mandazi Madrid", "Ugali Utd", "Kasarani Cats", "Pilau Pirates",
    "Uhuru Park Rangers", "Maasai Mara Lions", "Tusker Tuesday", "Jua Kali Juniors", "Kenchic Dynamos", "Eastleigh Eagles",
    "Rift Valley Rockets", "Lake Basin Bullets", "Coast Kraken", "Nakuru Flamingos", "Kakamega Crying Stone", "Thika Road Travellers",
    "Mombasa Raha", "Kitengela Titans", "Karen Kickers", "Westlands Wanderers", "Rongai Rovers", "Ngong Hills Hotspur",
    "Kibera Galaxy", "Mathare Magic", "Kondele Commandos", "Luanda Magere", "Mwisho wa Reli", "Pwani FC",
  ];
  const managers = userRows.filter((u) => u.role === "fan" && !u.isAdmin);
  const entryRows = await db
    .insert(s.fantasyEntries)
    .values(managers.map((u, i) => ({ userId: u.id, teamName: TEAM_NAMES[i % TEAM_NAMES.length], startGameweekId: 1 })))
    .returning();

  const pickValues: (typeof s.entryPicks.$inferInsert)[] = [];
  for (const entry of entryRows) {
    let squad = randomSquad(playerRows);
    let lineup = defaultLineup(squad);
    for (let gw = 1; gw < NEXT_GW + 1; gw++) {
      if (gw > 1 && rand() < 0.45) {
        // One transfer, like-for-like, keeping budget and club limits.
        const out = pick(squad);
        const candidates = shuffle(playerRows.filter((p) => p.position === out.position && !squad.includes(p)));
        for (const inn of candidates) {
          const trial = squad.map((p) => (p === out ? inn : p));
          if (validateSquad(trial, BUDGET) === null) {
            squad = trial;
            lineup = lineup.map((l) => (l.playerId === out.id ? { ...l, playerId: inn.id } : l));
            break;
          }
        }
      }
      if (gw > 1 && rand() < 0.5) {
        const starters = lineup.filter((l) => l.slot <= 11);
        const cap = pick(starters);
        const vice = pick(starters.filter((l) => l !== cap));
        lineup = lineup.map((l) => ({ ...l, isCaptain: l === cap, isVice: l === vice }));
      }
      if (gw === 1 || gw === NEXT_GW || rand() < 0.7) {
        pickValues.push(...lineup.map((l) => ({ ...l, entryId: entry.id, gameweekId: gw })));
      }
    }
  }
  for (let i = 0; i < pickValues.length; i += 1000) {
    await db.insert(s.entryPicks).values(pickValues.slice(i, i + 1000));
  }
  for (let gw = 1; gw < NEXT_GW; gw++) await recalculateGameweek(db, gw);
  console.log(`${entryRows.length} fantasy managers scored through GW${NEXT_GW - 1}`);

  /* leagues */
  const admin = userId("riadha");
  const [launch, office, chama] = await db
    .insert(s.leagues)
    .values([
      { name: "Riadha Launch League", code: "RIADHA", ownerId: admin },
      { name: "Upper Hill Office League", code: "OFFICE7", ownerId: managers[0].id },
      { name: "Kakamega Chama", code: "CHAMA25", ownerId: managers[1].id },
    ])
    .returning();
  await db.insert(s.leagueMembers).values([
    ...entryRows.map((e) => ({ leagueId: launch.id, entryId: e.id })),
    ...entryRows.slice(0, 12).map((e) => ({ leagueId: office.id, entryId: e.id })),
    ...entryRows.slice(10, 19).map((e) => ({ leagueId: chama.id, entryId: e.id })),
  ]);

  /* communities, marketplace, scouting, comments */
  await seedModules(db);

  console.log(`Done. GW${NEXT_GW} deadline: ${nextDeadline.toISOString()}`);
  console.log("Admin login: +254700000001 (OTP is shown on screen in dev mode)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
