ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "trip_date" date;
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "legacy_report_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trips_legacy_report_id_unique" ON "trips" ("legacy_report_id");
--> statement-breakpoint
UPDATE "trips"
SET "trip_date" = "start_at"::date
WHERE "trip_date" IS NULL AND "start_at" IS NOT NULL;
--> statement-breakpoint
UPDATE "trips"
SET "notes" = "route_plan"
WHERE ("notes" IS NULL OR btrim("notes") = '')
  AND "route_plan" IS NOT NULL
  AND btrim("route_plan") <> '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_report_map" (
  "report_id" uuid PRIMARY KEY REFERENCES "trip_reports"("id") ON DELETE CASCADE,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_pins" (
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "pin_id" uuid NOT NULL REFERENCES "pins"("id") ON DELETE CASCADE,
  PRIMARY KEY ("trip_id", "pin_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_routes" (
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "track_id" uuid NOT NULL REFERENCES "tracks"("id") ON DELETE CASCADE,
  PRIMARY KEY ("trip_id", "track_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_photos" (
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "photo_id" uuid NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
  PRIMARY KEY ("trip_id", "photo_id")
);
--> statement-breakpoint
UPDATE "trips" t
SET "notes" = concat_ws(E'\n\n', NULLIF(t."notes", ''), extra.body)
FROM (
  SELECT r.trip_id,
    string_agg(r.body, E'\n\n' ORDER BY r.trip_date NULLS LAST, r.created_at) AS body
  FROM "trip_reports" r
  WHERE r.trip_id IS NOT NULL
    AND r.post_kind = 'trip_report'
    AND r.body IS NOT NULL
    AND btrim(r.body) <> ''
    AND position(r.body in coalesce((SELECT notes FROM trips WHERE id = r.trip_id), '')) = 0
  GROUP BY r.trip_id
) extra
WHERE t.id = extra.trip_id
  AND extra.body IS NOT NULL;
--> statement-breakpoint
UPDATE "trips" t
SET "trip_date" = src.trip_date
FROM (
  SELECT trip_id, min(trip_date) AS trip_date
  FROM "trip_reports"
  WHERE trip_id IS NOT NULL
    AND post_kind = 'trip_report'
    AND trip_date IS NOT NULL
  GROUP BY trip_id
) src
WHERE t.id = src.trip_id
  AND t.trip_date IS NULL;
--> statement-breakpoint
INSERT INTO "trip_report_map" ("report_id", "trip_id")
SELECT r.id, r.trip_id
FROM "trip_reports" r
WHERE r.trip_id IS NOT NULL
  AND r.post_kind = 'trip_report'
ON CONFLICT ("report_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "trips" (
  "title", "slug", "activity", "start_at", "trip_date", "notes", "status", "created_by", "legacy_report_id"
)
SELECT
  COALESCE(NULLIF(btrim(r.title), ''), 'Trip'),
  COALESCE(
    NULLIF(trim(both '-' from left(regexp_replace(lower(COALESCE(NULLIF(btrim(r.title), ''), 'trip')), '[^a-z0-9]+', '-', 'g'), 40)), ''),
    'trip'
  ) || '-' || left(replace(r.id::text, '-', ''), 8),
  COALESCE(r.activity, 'hike'::activity),
  r.trip_date::timestamptz,
  r.trip_date,
  NULLIF(r.body, ''),
  CASE
    WHEN r.trip_date IS NOT NULL AND r.trip_date < CURRENT_DATE THEN 'done'::trip_status
    ELSE 'planned'::trip_status
  END,
  r.author_id,
  r.id
FROM "trip_reports" r
WHERE r.trip_id IS NULL
  AND r.post_kind = 'trip_report'
  AND NOT EXISTS (SELECT 1 FROM "trip_report_map" m WHERE m.report_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM "trips" t WHERE t.legacy_report_id = r.id);
--> statement-breakpoint
INSERT INTO "trip_report_map" ("report_id", "trip_id")
SELECT t.legacy_report_id, t.id
FROM "trips" t
WHERE t.legacy_report_id IS NOT NULL
ON CONFLICT ("report_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "trip_pins" ("trip_id", "pin_id")
SELECT "trip_id", "id" FROM "pins" WHERE "trip_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "trip_pins" ("trip_id", "pin_id")
SELECT m.trip_id, p.id
FROM "pins" p
JOIN "trip_report_map" m ON m.report_id = p.trip_report_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "trip_routes" ("trip_id", "track_id")
SELECT "trip_id", "id" FROM "tracks" WHERE "trip_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "trip_routes" ("trip_id", "track_id")
SELECT m.trip_id, t.id
FROM "tracks" t
JOIN "trip_report_map" m ON m.report_id = t.trip_report_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "trip_photos" ("trip_id", "photo_id")
SELECT m.trip_id, ph.id
FROM "photos" ph
JOIN "trip_report_map" m ON m.report_id = ph.trip_report_id
ON CONFLICT DO NOTHING;
