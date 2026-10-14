ALTER TABLE "pins" ADD COLUMN "visited_on" date;--> statement-breakpoint
CREATE INDEX "pins_created_by_idx" ON "pins" USING btree ("created_by");
