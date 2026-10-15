DROP INDEX IF EXISTS "summits_user_peak_unique";--> statement-breakpoint
ALTER TABLE "summits" ALTER COLUMN "summited_at" DROP NOT NULL;--> statement-breakpoint
DELETE FROM "summits" WHERE "track_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "summits_user_peak_idx" ON "summits" USING btree ("user_id","peak_slug");--> statement-breakpoint
ALTER TABLE "packing_list_items" ADD COLUMN IF NOT EXISTS "added_by" text;--> statement-breakpoint
ALTER TABLE "packing_list_items" DROP CONSTRAINT IF EXISTS "packing_list_items_added_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "packing_list_items" ADD CONSTRAINT "packing_list_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_trip_report_id_trip_reports_id_fk";--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" DROP CONSTRAINT "photos_trip_report_id_trip_reports_id_fk";--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" DROP CONSTRAINT "pins_trip_report_id_trip_reports_id_fk";--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE set null ON UPDATE no action;
