DROP INDEX IF EXISTS "trips_legacy_report_id_unique";
ALTER TABLE "trips" DROP COLUMN IF EXISTS "legacy_report_id";
ALTER TABLE "trips" DROP COLUMN IF EXISTS "route_plan";
ALTER TABLE "trips" DROP COLUMN IF EXISTS "status";
DROP TYPE IF EXISTS "trip_status";
DROP INDEX IF EXISTS "tracks_source_external_unique";
ALTER TABLE "tracks" DROP COLUMN IF EXISTS "external_id";
