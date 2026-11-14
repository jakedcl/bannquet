INSERT INTO posts (id, title, body, created_by, created_at, updated_at)
SELECT
  t.id,
  t.title,
  trim(both E'\n' from concat_ws(
    E'\n\n',
    nullif(trim(t.notes), ''),
    CASE
      WHEN coalesce(t.trip_date, t.start_at::date) IS NOT NULL OR t.start_at IS NOT NULL OR t.end_at IS NOT NULL THEN
        'Dates: ' || concat_ws(
          ' – ',
          to_char(coalesce(t.trip_date, t.start_at::date), 'YYYY-MM-DD'),
          CASE WHEN t.end_at IS NOT NULL AND t.end_at::date <> coalesce(t.trip_date, t.start_at::date)
            THEN to_char(t.end_at::date, 'YYYY-MM-DD') ELSE NULL END
        )
      ELSE NULL
    END,
    NULLIF(attach.names, '')
  )),
  t.created_by,
  t.created_at,
  t.created_at
FROM trips t
LEFT JOIN LATERAL (
  SELECT string_agg(item.name, ', ' ORDER BY item.sort_key, item.name) AS names
  FROM (
    SELECT 1 AS sort_key, p.title AS name
    FROM trip_pins tp
    JOIN pins p ON p.id = tp.pin_id
    WHERE tp.trip_id = t.id
    UNION ALL
    SELECT 2, coalesce(nullif(trim(tr.title), ''), tr.name)
    FROM trip_routes trl
    JOIN tracks tr ON tr.id = trl.track_id
    WHERE trl.trip_id = t.id
    UNION ALL
    SELECT 3, coalesce(nullif(trim(ph.caption), ''), nullif(trim(ph.alt), ''), 'Photo')
    FROM trip_photos tph
    JOIN photos ph ON ph.id = tph.photo_id
    WHERE tph.trip_id = t.id
  ) item
) attach ON true
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = t.id);
