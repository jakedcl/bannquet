CREATE TYPE "post_kind" AS ENUM('trip_report', 'general');--> statement-breakpoint
ALTER TABLE "trip_reports" ADD COLUMN "post_kind" "post_kind" DEFAULT 'trip_report' NOT NULL;
