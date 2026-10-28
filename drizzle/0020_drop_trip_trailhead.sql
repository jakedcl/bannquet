DROP INDEX IF EXISTS "trips_trailhead_point_idx";
ALTER TABLE "trips" DROP COLUMN IF EXISTS "trailhead_point";
ALTER TABLE "trips" DROP COLUMN IF EXISTS "trailhead_name";
