ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
UPDATE "tracks"
SET "title" = left(btrim("name"), 120)
WHERE "title" IS NULL
  AND btrim("name") <> ''
  AND lower(btrim("name")) NOT IN ('route', 'untitled', 'no title');
