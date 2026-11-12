CREATE TYPE "public"."activity_source" AS ENUM('recorded', 'gpx', 'tcx', 'fit');--> statement-breakpoint
CREATE TYPE "public"."activity_sport" AS ENUM('run', 'walk', 'ride');--> statement-breakpoint
CREATE TYPE "public"."challenge_kind" AS ENUM('single', 'total');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('pending', 'live', 'rejected');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "activity_sport" DEFAULT 'run' NOT NULL,
	"source" "activity_source" NOT NULL,
	"title" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"distance_m" integer NOT NULL,
	"moving_s" integer NOT NULL,
	"elapsed_s" integer NOT NULL,
	"elevation_gain_m" integer DEFAULT 0 NOT NULL,
	"splits" jsonb NOT NULL,
	"route_art" jsonb,
	"profile" jsonb NOT NULL,
	"device" text,
	"client_id" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"flag" text,
	"event_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_tracks" (
	"activity_id" integer PRIMARY KEY NOT NULL,
	"points" jsonb NOT NULL,
	"start_lat" double precision NOT NULL,
	"start_lng" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "best_efforts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" integer NOT NULL,
	"effort" text NOT NULL,
	"ms" integer NOT NULL,
	"achieved_at" timestamp with time zone NOT NULL,
	"is_pr" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_entries" (
	"challenge_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"progress_m" integer DEFAULT 0 NOT NULL,
	"best_ms" integer,
	"completed_at" timestamp with time zone,
	"activity_id" integer,
	CONSTRAINT "challenge_entries_challenge_id_user_id_pk" PRIMARY KEY("challenge_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" "challenge_kind" NOT NULL,
	"sport" "activity_sport" DEFAULT 'run' NOT NULL,
	"goal_m" integer NOT NULL,
	"max_ms" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"occasion" text,
	"cause" text,
	"accent" text DEFAULT 'green' NOT NULL,
	"sponsor_id" integer,
	"status" "challenge_status" DEFAULT 'live' NOT NULL,
	"created_by" uuid,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "privacy_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"radius_m" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_digests" (
	"key" text PRIMARY KEY NOT NULL,
	"post_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_weeks" (
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"activities" integer DEFAULT 0 NOT NULL,
	"run_m" integer DEFAULT 0 NOT NULL,
	"walk_m" integer DEFAULT 0 NOT NULL,
	"ride_m" integer DEFAULT 0 NOT NULL,
	"active_days" integer DEFAULT 0 NOT NULL,
	"prs" integer DEFAULT 0 NOT NULL,
	"group_runs" integer DEFAULT 0 NOT NULL,
	"challenges" integer DEFAULT 0 NOT NULL,
	"beat_average" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_weeks_user_id_week_start_pk" PRIMARY KEY("user_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "time_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event" text NOT NULL,
	"ms" integer NOT NULL,
	"date" date NOT NULL,
	"venue" text NOT NULL,
	"note" text,
	"activity_id" integer,
	"verifier_id" uuid,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_events" ADD COLUMN "is_group_run" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "community_events" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "community_events" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "community_events" ADD COLUMN "recap_post_id" integer;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD COLUMN "attended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "kind" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "activity_id" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hide_routes" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tracks" ADD CONSTRAINT "activity_tracks_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_efforts" ADD CONSTRAINT "best_efforts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_efforts" ADD CONSTRAINT "best_efforts_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_sponsor_id_businesses_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_zones" ADD CONSTRAINT "privacy_zones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_weeks" ADD CONSTRAINT "run_weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_trials" ADD CONSTRAINT "time_trials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_trials" ADD CONSTRAINT "time_trials_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_trials" ADD CONSTRAINT "time_trials_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_idx" ON "activities" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "activities_started_idx" ON "activities" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "activities_event_idx" ON "activities" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_client_idx" ON "activities" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "best_efforts_user_idx" ON "best_efforts" USING btree ("user_id","effort","ms");--> statement-breakpoint
CREATE INDEX "best_efforts_effort_idx" ON "best_efforts" USING btree ("effort","ms");--> statement-breakpoint
CREATE INDEX "challenge_entries_user_idx" ON "challenge_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "challenges_status_idx" ON "challenges" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "privacy_zones_user_idx" ON "privacy_zones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "run_weeks_week_idx" ON "run_weeks" USING btree ("week_start","points");--> statement-breakpoint
CREATE INDEX "time_trials_user_idx" ON "time_trials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_trials_verifier_idx" ON "time_trials" USING btree ("verifier_id","status");--> statement-breakpoint
CREATE INDEX "time_trials_event_idx" ON "time_trials" USING btree ("event","status","ms");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_activity_idx" ON "posts" USING btree ("activity_id");