-- Peaks are an "I've been here" list with a count: one row per visit, no climb
-- date, no link to a route or photo. Repeat visits stay as separate rows.
ALTER TABLE "summits" DROP CONSTRAINT IF EXISTS "summits_track_id_tracks_id_fk";
ALTER TABLE "summits" DROP CONSTRAINT IF EXISTS "summits_photo_id_photos_id_fk";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "summited_at";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "track_id";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "photo_id";
