import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["fan", "athlete", "club", "scout"]);
export const positionEnum = pgEnum("position", ["GK", "DEF", "MID", "FWD"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
]);
export const scoutStageEnum = pgEnum("scout_stage", ["watching", "contacted", "trial", "signed"]);
export const communityRoleEnum = pgEnum("community_role", ["owner", "admin", "member"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "interested"]);
export const businessCategoryEnum = pgEnum("business_category", [
  "gym",
  "academy",
  "shop",
  "physio",
  "coach",
  "venue",
  "nutrition",
  "other",
]);
export const adStatusEnum = pgEnum("ad_status", ["pending", "active", "paused", "rejected", "ended"]);
export const adEventKindEnum = pgEnum("ad_event_kind", ["impression", "click"]);

/* ───────────── Identity & social ───────────── */

export const kplClubs = pgTable("kpl_clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  city: text("city").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull().unique(),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull().default("fan"),
    verified: boolean("verified").notNull().default(false),
    isAdmin: boolean("is_admin").notNull().default(false),
    onboarded: boolean("onboarded").notNull().default(false),
    bio: text("bio"),
    quote: text("quote"),
    tagline: text("tagline"),
    sport: text("sport"),
    position: text("position"),
    county: text("county"),
    dateOfBirth: date("date_of_birth"),
    guardianPhone: text("guardian_phone"),
    kplClubId: integer("kpl_club_id").references(() => kplClubs.id),
    avatarUrl: text("avatar_url"),
    heroUrl: text("hero_url"),
    // Scouting profile (athletes)
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    heightCm: integer("height_cm"),
    preferredSide: text("preferred_side"), // "Left" | "Right" | "Both"
    openToOpportunities: boolean("open_to_opportunities").notNull().default(false),
    willingToRelocate: boolean("willing_to_relocate").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role), index("users_sport_county_idx").on(t.sport, t.county)],
);

export const athleteStats = pgTable(
  "athlete_stats",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    context: text("context"),
    verifiedByClub: boolean("verified_by_club").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("athlete_stats_user_idx").on(t.userId)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    index("follows_followee_idx").on(t.followeeId),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    mediaUrl: text("media_url"),
    mediaType: text("media_type"), // "image" | "video"
    statLabel: text("stat_label"),
    statValue: text("stat_value"),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_author_idx").on(t.authorId), index("posts_created_idx").on(t.createdAt)],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: roleEnum("type").notNull(),
  status: verificationStatusEnum("status").notNull().default("pending"),
  legalName: text("legal_name").notNull(),
  organisation: text("organisation"),
  details: text("details"),
  evidenceUrl: text("evidence_url"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
});

export const contactRequests = pgTable(
  "contact_requests",
  {
    id: serial("id").primaryKey(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    routedToGuardian: boolean("routed_to_guardian").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_requests_athlete_idx").on(t.athleteId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_codes_phone_idx").on(t.phone)],
);

/* ───────────── Fantasy ───────────── */

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id")
      .notNull()
      .references(() => kplClubs.id),
    name: text("name").notNull(),
    position: positionEnum("position").notNull(),
    /** Price in tenths of a million KSh: 55 = KSh 5.5m */
    price: integer("price").notNull(),
    available: boolean("available").notNull().default(true),
  },
  (t) => [index("players_club_idx").on(t.clubId)],
);

export const gameweeks = pgTable("gameweeks", {
  id: integer("id").primaryKey(), // gameweek number
  name: text("name").notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  finished: boolean("finished").notNull().default(false),
});

export const fixtures = pgTable(
  "fixtures",
  {
    id: serial("id").primaryKey(),
    gameweekId: integer("gameweek_id")
      .notNull()
      .references(() => gameweeks.id),
    homeClubId: integer("home_club_id")
      .notNull()
      .references(() => kplClubs.id),
    awayClubId: integer("away_club_id")
      .notNull()
      .references(() => kplClubs.id),
    kickoff: timestamp("kickoff", { withTimezone: true }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    finished: boolean("finished").notNull().default(false),
  },
  (t) => [index("fixtures_gw_idx").on(t.gameweekId)],
);

export const playerStats = pgTable(
  "player_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    gameweekId: integer("gameweek_id")
      .notNull()
      .references(() => gameweeks.id),
    minutes: integer("minutes").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    penSaved: integer("pen_saved").notNull().default(0),
    penMissed: integer("pen_missed").notNull().default(0),
    yellow: integer("yellow").notNull().default(0),
    red: integer("red").notNull().default(0),
    ownGoals: integer("own_goals").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    goalsConceded: integer("goals_conceded").notNull().default(0),
    cleanSheet: boolean("clean_sheet").notNull().default(false),
    points: integer("points").notNull().default(0),
  },
  (t) => [
    uniqueIndex("player_stats_player_fixture_uq").on(t.playerId, t.fixtureId),
    index("player_stats_gw_idx").on(t.gameweekId),
  ],
);

export const fantasyEntries = pgTable("fantasy_entries", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  teamName: text("team_name").notNull(),
  startGameweekId: integer("start_gameweek_id")
    .notNull()
    .references(() => gameweeks.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per squad slot per gameweek. Slots 1–11 start, 12 is the bench GK,
 * 13–15 are the outfield bench in substitution order.
 */
export const entryPicks = pgTable(
  "entry_picks",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => fantasyEntries.id, { onDelete: "cascade" }),
    gameweekId: integer("gameweek_id")
      .notNull()
      .references(() => gameweeks.id),
    slot: integer("slot").notNull(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    isCaptain: boolean("is_captain").notNull().default(false),
    isVice: boolean("is_vice").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.gameweekId, t.slot] }),
    uniqueIndex("entry_picks_player_uq").on(t.entryId, t.gameweekId, t.playerId),
  ],
);

export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => fantasyEntries.id, { onDelete: "cascade" }),
    gameweekId: integer("gameweek_id")
      .notNull()
      .references(() => gameweeks.id),
    playerInId: integer("player_in_id")
      .notNull()
      .references(() => players.id),
    playerOutId: integer("player_out_id")
      .notNull()
      .references(() => players.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transfers_entry_idx").on(t.entryId)],
);

export const entryGameweeks = pgTable(
  "entry_gameweeks",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => fantasyEntries.id, { onDelete: "cascade" }),
    gameweekId: integer("gameweek_id")
      .notNull()
      .references(() => gameweeks.id),
    points: integer("points").notNull().default(0),
    rawPoints: integer("raw_points").notNull().default(0),
    hits: integer("hits").notNull().default(0),
    benchPoints: integer("bench_points").notNull().default(0),
    transfersMade: integer("transfers_made").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.gameweekId] })],
);

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagueMembers = pgTable(
  "league_members",
  {
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => fantasyEntries.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.entryId] })],
);

/* ───────────── Feed comments ───────────── */

export const postComments = pgTable(
  "post_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt)],
);

/* ───────────── Scout portal ───────────── */

/** A scout's shortlist: one row per athlete, with a pipeline stage and private notes. */
export const scoutBookmarks = pgTable(
  "scout_bookmarks",
  {
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: scoutStageEnum("stage").notNull().default("watching"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.scoutId, t.athleteId] })],
);

/* ───────────── Communities ───────────── */

export const communities = pgTable(
  "communities",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(), // a sport or an interest, e.g. "Running", "Chess"
    county: text("county"),
    coverUrl: text("cover_url"),
    isPrivate: boolean("is_private").notNull().default(false),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("communities_category_idx").on(t.category)],
);

export const communityMembers = pgTable(
  "community_members",
  {
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: communityRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.userId] }), index("community_members_user_idx").on(t.userId)],
);

export const communityMessages = pgTable(
  "community_messages",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("community_messages_room_idx").on(t.communityId, t.id)],
);

export const communityEvents = pgTable(
  "community_events",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("community_events_room_idx").on(t.communityId, t.startsAt)],
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => communityEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull().default("going"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

/* ───────────── Marketplace & ads ───────────── */

export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: businessCategoryEnum("category").notNull(),
    description: text("description").notNull().default(""),
    county: text("county").notNull(),
    address: text("address"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    website: text("website"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    sports: text("sports").array().notNull().default(sql`'{}'::text[]`),
    priceFrom: integer("price_from"), // KSh
    hours: text("hours"),
    verified: boolean("verified").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("businesses_category_county_idx").on(t.category, t.county)],
);

/**
 * A targeted ad for a business. Empty targeting arrays mean "everyone". Campaigns start as
 * "pending" and an admin approves them. (Billing is intentionally not modelled yet.)
 */
export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    headline: text("headline").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    ctaLabel: text("cta_label").notNull().default("Learn more"),
    ctaUrl: text("cta_url"), // null = the business's Riadha page
    targetSports: text("target_sports").array().notNull().default(sql`'{}'::text[]`),
    targetCounties: text("target_counties").array().notNull().default(sql`'{}'::text[]`),
    targetRoles: text("target_roles").array().notNull().default(sql`'{}'::text[]`),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    status: adStatusEnum("status").notNull().default("pending"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ad_campaigns_status_idx").on(t.status)],
);

export const adEvents = pgTable(
  "ad_events",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: adEventKindEnum("kind").notNull(),
    placement: text("placement"), // "home" | "watch" | "market"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ad_events_campaign_kind_idx").on(t.campaignId, t.kind)],
);

export type User = typeof users.$inferSelect;
export type Player = typeof players.$inferSelect;
export type KplClub = typeof kplClubs.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Gameweek = typeof gameweeks.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Position = (typeof positionEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type ScoutStage = (typeof scoutStageEnum.enumValues)[number];
export type BusinessCategory = (typeof businessCategoryEnum.enumValues)[number];
export type Community = typeof communities.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type AdCampaign = typeof adCampaigns.$inferSelect;
