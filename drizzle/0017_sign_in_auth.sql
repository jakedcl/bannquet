ALTER TABLE "users" ADD COLUMN "last_sign_in_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE "sign_in_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_key" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sign_in_attempts_bucket_attempted_idx" ON "sign_in_attempts" USING btree ("bucket_key","attempted_at");
