ALTER TABLE "tracks" ADD COLUMN "trip_report_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD COLUMN "activity" "activity";--> statement-breakpoint
ALTER TABLE "trip_reports" ADD COLUMN "tagged_user_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracks_trip_report_idx" ON "tracks" USING btree ("trip_report_id");