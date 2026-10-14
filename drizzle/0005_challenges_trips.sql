DROP INDEX "summits_user_peak_idx";--> statement-breakpoint
ALTER TABLE "peaks" ALTER COLUMN "list" SET DATA TYPE text USING "list"::text;--> statement-breakpoint
CREATE UNIQUE INDEX "summits_user_peak_unique" ON "summits" USING btree ("user_id","peak_slug");--> statement-breakpoint
DROP TYPE "public"."peak_list";
