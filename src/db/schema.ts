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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role)],
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

export type User = typeof users.$inferSelect;
export type Player = typeof players.$inferSelect;
export type KplClub = typeof kplClubs.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Gameweek = typeof gameweeks.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Position = (typeof positionEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
