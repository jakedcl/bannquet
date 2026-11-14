-- Real post attachments before trip junction tables are dropped (trip_id = post id from 0025).
CREATE TABLE IF NOT EXISTS "post_pins" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "pin_id" uuid NOT NULL REFERENCES "pins"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "pin_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_routes" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "track_id" uuid NOT NULL REFERENCES "tracks"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "track_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_photos" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "photo_id" uuid NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "photo_id")
);
--> statement-breakpoint
INSERT INTO post_pins (post_id, pin_id)
SELECT trip_id, pin_id FROM trip_pins
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO post_routes (post_id, track_id)
SELECT trip_id, track_id FROM trip_routes
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO post_photos (post_id, photo_id)
SELECT trip_id, photo_id FROM trip_photos
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_trip_id_trips_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "trip_pins";
--> statement-breakpoint
DROP TABLE IF EXISTS "trip_routes";
--> statement-breakpoint
DROP TABLE IF EXISTS "trip_photos";
--> statement-breakpoint
DROP TABLE IF EXISTS "trip_members";
--> statement-breakpoint
DROP TABLE IF EXISTS "notifications";
--> statement-breakpoint
DROP TABLE IF EXISTS "trips";
--> statement-breakpoint
DROP TYPE IF EXISTS "trip_member_role";
