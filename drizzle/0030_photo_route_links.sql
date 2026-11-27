ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."photo_route_source" AS ENUM('auto', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_routes" (
	"photo_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"source" "photo_route_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photo_routes_pkey" PRIMARY KEY("photo_id","track_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "photo_routes" ADD CONSTRAINT "photo_routes_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "photo_routes" ADD CONSTRAINT "photo_routes_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_route_unlinks" (
	"photo_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photo_route_unlinks_pkey" PRIMARY KEY("photo_id","track_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "photo_route_unlinks" ADD CONSTRAINT "photo_route_unlinks_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "photo_route_unlinks" ADD CONSTRAINT "photo_route_unlinks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_routes_track_idx" ON "photo_routes" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_routes_photo_idx" ON "photo_routes" USING btree ("photo_id");