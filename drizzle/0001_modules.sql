CREATE TYPE "public"."ad_event_kind" AS ENUM('impression', 'click');--> statement-breakpoint
CREATE TYPE "public"."ad_status" AS ENUM('pending', 'active', 'paused', 'rejected', 'ended');--> statement-breakpoint
CREATE TYPE "public"."business_category" AS ENUM('gym', 'academy', 'shop', 'physio', 'coach', 'venue', 'nutrition', 'other');--> statement-breakpoint
CREATE TYPE "public"."community_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('going', 'interested');--> statement-breakpoint
CREATE TYPE "public"."scout_stage" AS ENUM('watching', 'contacted', 'trial', 'signed');--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"headline" text NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"cta_label" text DEFAULT 'Learn more' NOT NULL,
	"cta_url" text,
	"target_sports" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_counties" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_age" integer,
	"max_age" integer,
	"status" "ad_status" DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" uuid,
	"kind" "ad_event_kind" NOT NULL,
	"placement" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "business_category" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"county" text NOT NULL,
	"address" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"cover_url" text,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"sports" text[] DEFAULT '{}'::text[] NOT NULL,
	"price_from" integer,
	"hours" text,
	"verified" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"county" text,
	"cover_url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"capacity" integer,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"community_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "community_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_community_id_user_id_pk" PRIMARY KEY("community_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"event_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "rsvp_status" DEFAULT 'going' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scout_bookmarks" (
	"scout_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"stage" "scout_stage" DEFAULT 'watching' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scout_bookmarks_scout_id_athlete_id_pk" PRIMARY KEY("scout_id","athlete_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_cm" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_side" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "open_to_opportunities" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "willing_to_relocate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scout_bookmarks" ADD CONSTRAINT "scout_bookmarks_scout_id_users_id_fk" FOREIGN KEY ("scout_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scout_bookmarks" ADD CONSTRAINT "scout_bookmarks_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_events_campaign_kind_idx" ON "ad_events" USING btree ("campaign_id","kind");--> statement-breakpoint
CREATE INDEX "businesses_category_county_idx" ON "businesses" USING btree ("category","county");--> statement-breakpoint
CREATE INDEX "communities_category_idx" ON "communities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "community_events_room_idx" ON "community_events" USING btree ("community_id","starts_at");--> statement-breakpoint
CREATE INDEX "community_members_user_idx" ON "community_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_messages_room_idx" ON "community_messages" USING btree ("community_id","id");--> statement-breakpoint
CREATE INDEX "post_comments_post_idx" ON "post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "users_sport_county_idx" ON "users" USING btree ("sport","county");