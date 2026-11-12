CREATE TYPE "public"."league_kind" AS ENUM('private', 'club', 'public');--> statement-breakpoint
CREATE TABLE "chat_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"league_id" integer,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"entry_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "leagues" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "league_members" ADD COLUMN "last_read_message_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "league_members" ADD COLUMN "muted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "kind" "league_kind" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "club_id" integer;--> statement-breakpoint
ALTER TABLE "chat_flags" ADD CONSTRAINT "chat_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_flags" ADD CONSTRAINT "chat_flags_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_messages" ADD CONSTRAINT "league_messages_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_messages" ADD CONSTRAINT "league_messages_entry_id_fantasy_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."fantasy_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_flags_user_idx" ON "chat_flags" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "league_messages_room_idx" ON "league_messages" USING btree ("league_id","id");--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_club_id_kpl_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."kpl_clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_club_id_unique" UNIQUE("club_id");--> statement-breakpoint
-- The launch league everyone joins becomes the one public league: Riadha Overall (standings only, no chat).
UPDATE "leagues" SET "kind" = 'public', "name" = 'Riadha Overall' WHERE "code" = 'RIADHA';
