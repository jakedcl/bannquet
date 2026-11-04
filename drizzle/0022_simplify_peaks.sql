-- Peaks are a simple "I've been here" list: one row per member per peak,
-- no climb date, no link to a route or photo. Keeps each member's earliest row.
DELETE FROM "summits" s
USING "summits" keep
WHERE s.user_id = keep.user_id
  AND s.peak_slug = keep.peak_slug
  AND (keep.created_at, keep.id) < (s.created_at, s.id);
ALTER TABLE "summits" DROP CONSTRAINT IF EXISTS "summits_track_id_tracks_id_fk";
ALTER TABLE "summits" DROP CONSTRAINT IF EXISTS "summits_photo_id_photos_id_fk";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "summited_at";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "track_id";
ALTER TABLE "summits" DROP COLUMN IF EXISTS "photo_id";
DROP INDEX IF EXISTS "summits_user_peak_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "summits_user_peak_unique" ON "summits" ("user_id", "peak_slug");
