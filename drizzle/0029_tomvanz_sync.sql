ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "external_source" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "external_rev" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "external_source" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "external_rev" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_exclusions" (
	"external_source" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_exclusions_pkey" PRIMARY KEY("external_source","external_id")
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "photos_external_sync_unique" ON "photos" USING btree ("external_source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracks_external_sync_unique" ON "tracks" USING btree ("external_source","external_id");