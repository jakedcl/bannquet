DROP TABLE IF EXISTS "trip_report_map";
--> statement-breakpoint
ALTER TABLE "pins" DROP COLUMN IF EXISTS "trip_report_id";
--> statement-breakpoint
ALTER TABLE "tracks" DROP COLUMN IF EXISTS "trip_report_id";
--> statement-breakpoint
ALTER TABLE "photos" DROP COLUMN IF EXISTS "trip_report_id";
--> statement-breakpoint
ALTER TABLE "pins" DROP COLUMN IF EXISTS "trip_id";
--> statement-breakpoint
ALTER TABLE "tracks" DROP COLUMN IF EXISTS "trip_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "trip_reports";
--> statement-breakpoint
DROP TYPE IF EXISTS "post_kind";
