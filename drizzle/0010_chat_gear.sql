CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text,
  "body" text DEFAULT '' NOT NULL,
  "ref_kind" text,
  "ref_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chat_messages_ref_pair" CHECK (
    ("ref_kind" IS NULL AND "ref_id" IS NULL)
    OR ("ref_kind" IN ('pin', 'route', 'photo') AND "ref_id" IS NOT NULL)
  ),
  CONSTRAINT "chat_messages_has_content" CHECK (char_length(btrim("body")) > 0 OR "ref_id" IS NOT NULL),
  CONSTRAINT "chat_messages_body_len" CHECK (char_length("body") <= 500)
);--> statement-breakpoint
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_created_idx" ON "chat_messages" USING btree ("created_at","id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_gear" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "added_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "community_gear" DROP CONSTRAINT IF EXISTS "community_gear_added_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "community_gear" ADD CONSTRAINT "community_gear_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_gear_name_idx" ON "community_gear" USING btree (lower("name"));--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_gear_holds" (
  "gear_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "qty" integer NOT NULL,
  CONSTRAINT "community_gear_holds_qty" CHECK ("qty" > 0),
  CONSTRAINT "community_gear_holds_pk" PRIMARY KEY("gear_id","user_id")
);--> statement-breakpoint
ALTER TABLE "community_gear_holds" DROP CONSTRAINT IF EXISTS "community_gear_holds_gear_id_community_gear_id_fk";--> statement-breakpoint
ALTER TABLE "community_gear_holds" ADD CONSTRAINT "community_gear_holds_gear_id_community_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."community_gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_gear_holds" DROP CONSTRAINT IF EXISTS "community_gear_holds_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "community_gear_holds" ADD CONSTRAINT "community_gear_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "home_screen_tip_seen_at" timestamp with time zone;
