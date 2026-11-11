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
