-- Post junction tables for pins, routes, and photos.
-- Production: run this AFTER 0025_migrate_trips_to_posts and BEFORE 0026_drop_trips_notifications
-- so trip_pins / trip_routes / trip_photos rows copy into real post attachments. On preview,
-- those trip tables may already be gone; the copy block is a no-op and only creates tables.
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
DO $$
BEGIN
  IF to_regclass('public.trip_pins') IS NOT NULL THEN
    INSERT INTO post_pins (post_id, pin_id)
    SELECT trip_id, pin_id FROM trip_pins
    ON CONFLICT DO NOTHING;
  END IF;
  IF to_regclass('public.trip_routes') IS NOT NULL THEN
    INSERT INTO post_routes (post_id, track_id)
    SELECT trip_id, track_id FROM trip_routes
    ON CONFLICT DO NOTHING;
  END IF;
  IF to_regclass('public.trip_photos') IS NOT NULL THEN
    INSERT INTO post_photos (post_id, photo_id)
    SELECT trip_id, photo_id FROM trip_photos
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
