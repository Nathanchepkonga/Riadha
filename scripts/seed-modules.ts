/**
 * Seeds the community, marketplace, scouting and comment modules on top of the base seed:
 * athlete scouting profiles, communities with chat/events/RSVPs, businesses, ad campaigns,
 * scout shortlists and post comments. Additive and idempotent: it skips if communities exist.
 *
 *   npm run db:seed:modules
 *
 * Names and businesses are illustrative, not real organisations.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { count, eq, inArray } from "drizzle-orm";
import { createDb, type DB } from "../src/db/client";
import * as s from "../src/db/schema";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

let seed = 20261008;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const sample = <T,>(a: T[], n: number) => [...a].sort(() => rand() - 0.5).slice(0, n);

/** A Nairobi-time date `days` from now at hh:mm. */
function at(days: number, hh: number, mm = 0) {
  const d = new Date(Date.now() + days * DAY);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(d);
  return new Date(`${ymd}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+03:00`);
}

const SCOUTING: Record<string, Partial<typeof s.users.$inferInsert>> = {
  faithchebet: { skills: ["Sprint finish", "Pacing", "Altitude trained", "Race tactics"], heightCm: 168, openToOpportunities: true, willingToRelocate: true },
  brianwekesa: { skills: ["Pace", "Dribbling", "Crossing", "Weak foot", "Work rate"], heightCm: 174, preferredSide: "Right", openToOpportunities: true, willingToRelocate: true },
  mercywanjiru: { skills: ["Endurance", "Pacing", "Altitude trained"], heightCm: 160, openToOpportunities: false },
  aminahassan: { skills: ["Ball handling", "Court vision", "Shooting", "Defence"], heightCm: 171, preferredSide: "Right", openToOpportunities: true },
  denniskiprop: { skills: ["Sprint finish", "Race tactics", "Endurance"], heightCm: 176, openToOpportunities: true, willingToRelocate: false },
  graceakinyi: { skills: ["Finishing", "Heading", "Pace", "Leadership"], heightCm: 169, preferredSide: "Left", openToOpportunities: true, willingToRelocate: true },
  collinsmutua: { skills: ["Footwork", "Power", "Counter-punching", "Southpaw"], heightCm: 183, preferredSide: "Left", openToOpportunities: true },
  ianochieng: { skills: ["Speed", "Offloads", "Sevens", "Tackling"], heightCm: 180, preferredSide: "Both", openToOpportunities: true, willingToRelocate: true },
};

const COMMUNITIES = [
  { owner: "karuradawn", name: "Nairobi Morning Run", category: "Running", county: "Nairobi", description: "10K and 21K group runs every Saturday and Sunday from Karura Gate A at 6:00am. Pace groups from 4:30 to 7:00 per km. Everyone welcome, nobody left behind." },
  { owner: "bukhunguacademy", name: "U17 Football Tournament", category: "Football", county: "Kakamega", description: "The western region U17 tournament: fixtures, team news and registration for coaches and parents. Scouts welcome on match days." },
  { owner: "lenafischer", name: "Kilimani Chess Club", category: "Chess", county: "Nairobi", description: "Rapid and blitz every Wednesday evening, a monthly rated tournament and lessons for juniors. Bring your own clock if you have one." },
  { owner: "itentrack", name: "Iten Track Sessions", category: "Athletics", county: "Elgeyo-Marakwet", description: "Tuesday and Thursday track sessions at Kamariny. Coaches share the workouts here the night before." },
  { owner: "aminahassan", name: "Mombasa Hoops", category: "Basketball", county: "Mombasa", description: "Pick-up runs, 3x3 tournaments and skills clinics on the coast. Courts change weekly, check the events tab." },
  { owner: "collinsmutua", name: "Eastlands Boxing Gym Crew", category: "Boxing", county: "Nairobi", description: "Sparring partners, fight nights and conditioning sessions for amateurs and pros." },
  { owner: "riadha", name: "Riadha Fantasy Managers", category: "Football", county: null, description: "Captain picks, transfer debates and banter for Riadha Fantasy managers. Deadline reminders every gameweek." },
  { owner: "ianochieng", name: "Kisumu Cyclists", category: "Cycling", county: "Kisumu", description: "Lakeside rides at dawn every weekend, 40–90km. Helmets compulsory." },
];

const CHAT: Record<string, string[]> = {
  "Nairobi Morning Run": [
    "Morning all! Who's in for the 21K on Saturday?",
    "Count me in. 5:30 pace group again?",
    "Yes, I'll lead 5:30. Gate A, 6am sharp.",
    "Bringing two friends from work, first time for them",
    "Karibu! We have a 7:00 group, nobody gets left behind 💪",
    "Anyone selling a spare hydration vest?",
    "Check the Marketplace, Kinetic Sports had them on offer last week",
    "That hill at km 14 humbled me today 😅",
    "Same. Hill repeats on Tuesday then!",
  ],
  "U17 Football Tournament": [
    "Fixtures for round 2 are up in the events tab.",
    "Will the Bukhungu pitch be ready after the rain?",
    "Groundsman says yes, we'll confirm Friday evening.",
    "Coaches: please send your final 18-player lists by Thursday.",
    "Two scouts from Nairobi confirmed for Saturday's matches.",
  ],
  "Kilimani Chess Club": [
    "Blitz tonight from 6pm, 5+3",
    "I'll be 20 minutes late, save me a board",
    "Juniors' lesson moved to 4pm on Saturday",
    "Who won last week's rapid?",
    "Wanjiku again, 6/7 🔥",
  ],
  "Riadha Fantasy Managers": [
    "Who's everyone captaining this week?",
    "Going with the Gor striker, home fixture",
    "Risky! Tusker's defence has been solid",
    "Wildcard now or wait for the double gameweek?",
    "Deadline is Saturday 1:30pm, don't forget",
  ],
};

const EVENTS: Record<string, { title: string; location: string; days: number; hh: number; mm?: number; hours: number; capacity?: number; description: string }[]> = {
  "Nairobi Morning Run": [
    { title: "21K long run", location: "Karura Forest, Gate A", days: 2, hh: 6, hours: 3, description: "Pace groups 4:30, 5:00, 5:30, 6:00 and 7:00 per km. Water points at 7K and 14K." },
    { title: "Hill repeats", location: "Arboretum, State House Rd", days: 5, hh: 6, mm: 15, hours: 1.5, capacity: 30, description: "8 × 300m hill repeats with jog-down recovery. Warm-up together at 6:15." },
    { title: "Community 5K & breakfast", location: "Uhuru Gardens", days: 12, hh: 7, hours: 2, capacity: 120, description: "Easy 5K for all levels, then breakfast together. Bring a friend." },
    { title: "Last month's half marathon", location: "Karura Forest", days: -9, hh: 6, hours: 3, description: "Thanks everyone who ran!" },
  ],
  "U17 Football Tournament": [
    { title: "Round 2: Kakamega vs Bungoma", location: "Bukhungu Stadium, Kakamega", days: 3, hh: 10, hours: 2, description: "Kick-off 10am. Gates open 9am. Scouts register at the main stand." },
    { title: "Semi-finals", location: "Bukhungu Stadium, Kakamega", days: 10, hh: 9, hours: 6, capacity: 400, description: "Both semi-finals back to back." },
  ],
  "Kilimani Chess Club": [
    { title: "Blitz night", location: "Kilimani Community Hall", days: 1, hh: 18, hours: 3, capacity: 40, description: "5+3 blitz, 9 rounds Swiss." },
    { title: "Monthly rated rapid", location: "Kilimani Community Hall", days: 9, hh: 10, hours: 7, capacity: 60, description: "15+10 rapid, FIDE-rated. Registration KSh 500 at the door." },
  ],
  "Iten Track Sessions": [{ title: "Track session: 12 × 400m", location: "Kamariny Stadium, Iten", days: 2, hh: 6, mm: 30, hours: 2, description: "12 × 400m off 60s. Coach Kiptoo leading." }],
  "Mombasa Hoops": [{ title: "3x3 beach tournament", location: "Mama Ngina Waterfront", days: 6, hh: 15, hours: 4, capacity: 64, description: "Teams of 3 + 1 sub. Sign up as a team or as a free agent." }],
  "Kisumu Cyclists": [{ title: "Lakeside 60K", location: "Kisumu Impala Sanctuary gate", days: 4, hh: 6, hours: 3, description: "Steady 25–28 km/h, regroup every 20K." }],
};

const BUSINESSES: (Omit<typeof s.businesses.$inferInsert, "slug" | "ownerId"> & { owner: string })[] = [
  { owner: "itentrack", name: "Iten Altitude Performance Centre", category: "gym", county: "Elgeyo-Marakwet", address: "Kamariny Road, Iten", email: "hello@itenaltitudeperf.example.com", description: "Strength, conditioning and recovery built for distance runners training at 2,400m. Coached sessions, track access and physio on site.", amenities: ["Free weights", "Track access", "Altitude training", "Ice baths", "Sports massage", "Showers"], sports: ["Athletics", "Running"], priceFrom: 2500, hours: "Mon–Sat 5:30am–8pm", verified: true },
  { owner: "bukhunguacademy", name: "Western Stars Football Academy", category: "academy", county: "Kakamega", address: "Bukhungu Stadium annex", email: "trials@westernstars.example.com", description: "U9 to U19 football academy with UEFA-B qualified coaches, school partnerships and a pathway to KPL clubs. Trials every first Saturday.", amenities: ["Floodlit pitch", "Changing rooms", "Equipment hire", "Physiotherapy"], sports: ["Football"], priceFrom: 3000, hours: "Weekdays 3pm–7pm, Sat 8am–1pm", verified: true },
  { owner: "riadha", name: "Kinetic Sports Kenya", category: "shop", county: "Nairobi", address: "Sarit Centre, Westlands", website: "https://example.com/kinetic", email: "hello@kineticsportsken.example.com", description: "Running shoes, boots, kit and hydration gear. Gait analysis in store and team kit printing for clubs.", amenities: ["Kit printing", "M-Pesa accepted", "Parking"], sports: ["Running", "Football", "Athletics", "Basketball"], priceFrom: 1500, hours: "Daily 9am–8pm", verified: true },
  { owner: "lenafischer", name: "Recover Physio & Sports Clinic", category: "physio", county: "Nairobi", address: "Kilimani, Argwings Kodhek Rd", email: "book@recover.example.com", description: "Sports physiotherapy, injury rehab and return-to-play programmes. Discounted sessions for registered athletes under 21.", amenities: ["Physiotherapy", "Sports massage", "Ice baths", "Wheelchair access"], sports: ["Football", "Rugby", "Athletics", "Basketball", "Boxing"], priceFrom: 2000, hours: "Mon–Fri 8am–6pm, Sat 9am–1pm", verified: false },
  { owner: "amanisports", name: "Coastline Hoops Academy", category: "academy", county: "Mombasa", address: "Makadara Grounds", email: "hello@coastlinehoopsac.example.com", description: "Basketball skills academy for ages 10–18: ball handling, shooting and game IQ. Weekend camps every school holiday.", amenities: ["Group classes", "Equipment hire"], sports: ["Basketball"], priceFrom: 1200, hours: "Sat–Sun 8am–12pm", verified: false },
  { owner: "karuradawn", name: "Pure Fuel Nutrition", category: "nutrition", county: "Nairobi", address: "Yaya Centre", email: "hello@purefuelnutritio.example.com", description: "Sports nutrition plans and locally made recovery meals for endurance athletes. Consultations with a registered dietitian.", amenities: ["Café", "M-Pesa accepted"], sports: ["Running", "Athletics", "Cycling"], priceFrom: 800, hours: "Mon–Sat 7am–7pm", verified: true },
  { owner: "collinsmutua", name: "Iron Fist Boxing Gym", category: "gym", county: "Nairobi", address: "Jericho, Eastlands", email: "hello@ironfistboxinggy.example.com", description: "Boxing fundamentals, sparring and strength classes. Pay per session or monthly.", amenities: ["Group classes", "Personal training", "Lockers"], sports: ["Boxing"], priceFrom: 300, hours: "Daily 6am–9pm", verified: false },
  { owner: "graceakinyi", name: "Lakeside Turf", category: "venue", county: "Kisumu", address: "Milimani, Kisumu", email: "hello@lakesideturf.example.com", description: "5-a-side and 7-a-side astro pitches, floodlit until 10pm. Book by the hour.", amenities: ["Astro turf", "Floodlit pitch", "Changing rooms", "Parking"], sports: ["Football", "Rugby"], priceFrom: 2500, hours: "Daily 7am–10pm", verified: true },
];

const COMMENTS = ["🔥🔥🔥", "Massive! Keep pushing", "That finish though 👏", "Proud of you!", "See you at the next session", "What's your training week like?", "Kenya to the world 🇰🇪", "Scouts need to see this", "Huge PB, congrats!", "This is why I follow you"];

export async function seedModules(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(s.communities);
  if (n > 0) {
    console.log("Modules already seeded (communities exist). Skipping.");
    return;
  }
  const users = await db.select().from(s.users);
  const byHandle = new Map(users.map((u) => [u.handle, u]));
  const need = (h: string) => {
    const u = byHandle.get(h);
    if (!u) throw new Error(`Run the base seed first: user @${h} is missing.`);
    return u;
  };
  const fans = users.filter((u) => u.role === "fan" && u.onboarded);

  /* Athlete scouting profiles */
  for (const [handle, patch] of Object.entries(SCOUTING)) {
    if (byHandle.has(handle)) await db.update(s.users).set(patch).where(eq(s.users.handle, handle));
  }

  /* Communities, members, chat, events, RSVPs */
  for (const c of COMMUNITIES) {
    const owner = need(c.owner);
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [row] = await db.insert(s.communities).values({ slug, name: c.name, category: c.category, county: c.county, description: c.description, ownerId: owner.id }).returning();
    const members = [owner, ...sample(users.filter((u) => u.id !== owner.id), 6 + Math.floor(rand() * 18))];
    await db.insert(s.communityMembers).values(
      members.map((u, i) => ({ communityId: row.id, userId: u.id, role: i === 0 ? ("owner" as const) : i === 1 ? ("admin" as const) : ("member" as const), joinedAt: new Date(Date.now() - (30 - i) * DAY) })),
    );

    const lines = CHAT[c.name] ?? [];
    let t = Date.now() - lines.length * 47 * 60_000;
    for (const body of lines) {
      t += (20 + rand() * 60) * 60_000;
      await db.insert(s.communityMessages).values({ communityId: row.id, userId: pick(members).id, body, createdAt: new Date(Math.min(t, Date.now() - 60_000)) });
    }

    for (const e of EVENTS[c.name] ?? []) {
      const startsAt = at(e.days, e.hh, e.mm ?? 0);
      const [ev] = await db
        .insert(s.communityEvents)
        .values({ communityId: row.id, title: e.title, description: e.description, location: e.location, startsAt, endsAt: new Date(startsAt.getTime() + e.hours * HOUR), capacity: e.capacity ?? null, createdBy: owner.id })
        .returning();
      const goers = sample(members, Math.min(members.length, 3 + Math.floor(rand() * 10)));
      await db.insert(s.eventRsvps).values(goers.map((u, i) => ({ eventId: ev.id, userId: u.id, status: i % 4 === 3 ? ("interested" as const) : ("going" as const) }))).onConflictDoNothing();
    }
  }
  console.log(`${COMMUNITIES.length} communities with members, chat, events and RSVPs`);

  /* Businesses */
  const bizRows: s.Business[] = [];
  for (const { owner, ...b } of BUSINESSES) {
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [row] = await db.insert(s.businesses).values({ ...b, slug, ownerId: need(owner).id }).returning();
    bizRows.push(row);
  }
  console.log(`${bizRows.length} businesses`);

  /* Ad campaigns: three running, one waiting for review */
  const biz = (name: string) => bizRows.find((b) => b.name === name)!;
  const campaigns = await db
    .insert(s.adCampaigns)
    .values([
      { businessId: biz("Kinetic Sports Kenya").id, headline: "20% off race-day shoes", body: "Gait analysis included. Show your Riadha profile in store at Sarit Centre.", ctaLabel: "Shop the offer", targetSports: ["Running", "Athletics"], status: "active" as const, startsAt: new Date(Date.now() - 3 * DAY), endsAt: new Date(Date.now() + 25 * DAY) },
      { businessId: biz("Iten Altitude Performance Centre").id, headline: "Train where champions train", body: "First week of altitude strength sessions free for Riadha athletes.", ctaLabel: "Book a trial", targetRoles: ["athlete"], status: "active" as const, startsAt: new Date(Date.now() - 1 * DAY) },
      { businessId: biz("Lakeside Turf").id, headline: "Floodlit 5-a-side in Kisumu", body: "Weeknight slots from KSh 2,500 an hour. Bring your crew.", ctaLabel: "Book a pitch", targetSports: ["Football"], status: "active" as const, startsAt: new Date(Date.now() - 2 * DAY) },
      { businessId: biz("Recover Physio & Sports Clinic").id, headline: "Back on the pitch faster", body: "Injury assessments for under-21 athletes at half price this month.", ctaLabel: "Book now", targetRoles: ["athlete"], minAge: 16, status: "pending" as const, startsAt: new Date() },
    ])
    .returning();
  const events: (typeof s.adEvents.$inferInsert)[] = [];
  for (const c of campaigns.filter((x) => x.status === "active")) {
    const views = 40 + Math.floor(rand() * 260);
    for (let i = 0; i < views; i++) {
      const u = rand() < 0.7 ? pick(users) : null;
      events.push({ campaignId: c.id, userId: u?.id, kind: "impression", placement: pick(["home", "watch", "market"]), createdAt: new Date(Date.now() - rand() * 3 * DAY) });
      if (rand() < 0.06) events.push({ campaignId: c.id, userId: u?.id, kind: "click", placement: pick(["home", "watch", "market"]), createdAt: new Date(Date.now() - rand() * 3 * DAY) });
    }
  }
  for (let i = 0; i < events.length; i += 500) await db.insert(s.adEvents).values(events.slice(i, i + 500));
  console.log(`${campaigns.length} ad campaigns, ${events.length} ad events`);

  /* Scout shortlists */
  const athletes = users.filter((u) => u.role === "athlete");
  const stages = ["watching", "contacted", "trial", "signed"] as const;
  for (const scout of ["amanisports", "lenafischer", "bukhunguacademy"].map((h) => byHandle.get(h)).filter(Boolean)) {
    const picks = sample(athletes, 4);
    await db.insert(s.scoutBookmarks).values(
      picks.map((a, i) => ({ scoutId: scout!.id, athleteId: a.id, stage: stages[i % stages.length], note: i === 0 ? "Strong finish on video. Ask the club for recent race splits." : i === 1 ? "Spoke to coach. Wants a trial after exams." : null, updatedAt: new Date(Date.now() - i * DAY) })),
    );
  }
  console.log("Scout shortlists");

  /* Comments on posts */
  const posts = await db.select({ id: s.posts.id }).from(s.posts);
  const commenters = [...fans, ...athletes];
  const comments: (typeof s.postComments.$inferInsert)[] = [];
  for (const p of posts) {
    const k = Math.floor(rand() * 5);
    for (let i = 0; i < k; i++) comments.push({ postId: p.id, userId: pick(commenters).id, body: pick(COMMENTS), createdAt: new Date(Date.now() - rand() * 4 * DAY) });
  }
  if (comments.length) await db.insert(s.postComments).values(comments);
  console.log(`${comments.length} comments`);

  // Keep scouts' role intact in case they were changed in testing.
  await db.update(s.users).set({ role: "scout" }).where(inArray(s.users.handle, ["amanisports", "lenafischer"]));
}

// Run directly: `npm run db:seed:modules`
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed-modules.ts")) {
  const { db, client } = createDb(process.env.DATABASE_URL, 3);
  seedModules(db)
    .then(() => console.log("Done."))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => client.end());
}
