DO $drop$
BEGIN
  IF (SELECT count(*) FROM packing_lists) <> 0 THEN RAISE EXCEPTION 'packing_lists not empty'; END IF;
  IF (SELECT count(*) FROM packing_list_items) <> 0 THEN RAISE EXCEPTION 'packing_list_items not empty'; END IF;
  IF (SELECT count(*) FROM packing_templates) <> 0 THEN RAISE EXCEPTION 'packing_templates not empty'; END IF;
  IF (SELECT count(*) FROM packing_template_items) <> 0 THEN RAISE EXCEPTION 'packing_template_items not empty'; END IF;
  IF (SELECT count(*) FROM gear_items) <> 0 THEN RAISE EXCEPTION 'gear_items not empty'; END IF;
  IF (SELECT count(*) FROM carpools) <> 0 THEN RAISE EXCEPTION 'carpools not empty'; END IF;
  IF (SELECT count(*) FROM carpool_riders) <> 0 THEN RAISE EXCEPTION 'carpool_riders not empty'; END IF;
  IF (SELECT count(*) FROM albums) <> 0 THEN RAISE EXCEPTION 'albums not empty'; END IF;
  IF (SELECT count(*) FROM photos WHERE album_id IS NOT NULL) <> 0 THEN RAISE EXCEPTION 'photos.album_id not empty'; END IF;
  IF (SELECT count(*) FROM guides) <> 0 THEN RAISE EXCEPTION 'guides not empty'; END IF;
  IF (SELECT count(*) FROM condition_reports) <> 0 THEN RAISE EXCEPTION 'condition_reports not empty'; END IF;
  IF (SELECT count(*) FROM badges) <> 0 THEN RAISE EXCEPTION 'badges not empty'; END IF;
  IF (SELECT count(*) FROM user_badges) <> 0 THEN RAISE EXCEPTION 'user_badges not empty'; END IF;
  IF (SELECT count(*) FROM strava_accounts) <> 0 THEN RAISE EXCEPTION 'strava_accounts not empty'; END IF;

  DROP TABLE IF EXISTS packing_list_items;
  DROP TABLE IF EXISTS packing_lists;
  DROP TABLE IF EXISTS packing_template_items;
  DROP TABLE IF EXISTS packing_templates;
  DROP TABLE IF EXISTS gear_items;
  DROP TABLE IF EXISTS carpool_riders;
  DROP TABLE IF EXISTS carpools;
  ALTER TABLE photos DROP COLUMN IF EXISTS album_id;
  DROP TABLE IF EXISTS albums;
  DROP TABLE IF EXISTS guides;
  DROP TABLE IF EXISTS condition_reports;
  DROP TYPE IF EXISTS condition_category;
  DROP TABLE IF EXISTS user_badges;
  DROP TABLE IF EXISTS badges;
  DROP TABLE IF EXISTS strava_accounts;
END
$drop$;
