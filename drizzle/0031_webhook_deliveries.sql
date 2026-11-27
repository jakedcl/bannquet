CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);