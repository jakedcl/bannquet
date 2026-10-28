import { sql, type SQL } from 'drizzle-orm';
import { HIDDEN_END_METERS, MAX_HIDDEN_SHARE } from '@/lib/route-privacy';

/**
 * SQL for a `tracks t` row: `cut` is the line without its ends (null when the
 * route shows everything), and `shown` is what this viewer may receive.
 * Use as: `from tracks t cross join lateral (${routeCutSql()}) cut` and
 * select `${shownLineSql(viewerId)}`.
 */
export function routeCutSql(): SQL {
  const share = sql`least(${HIDDEN_END_METERS}::float8 / greatest(ST_Length(t.line), 1), ${MAX_HIDDEN_SHARE}::float8)`;
  return sql`select case when t.hide_ends then ST_LineSubstring(t.line, ${share}, 1 - ${share})::geometry end as line`;
}

export function shownLineSql(viewerId: string | null): SQL {
  return sql`(case when cut.line is not null and t.user_id is distinct from ${viewerId ?? ''}::text then cut.line else t.line::geometry end)`;
}

/**
 * Where the route's marker goes. A route with hidden ends puts it mid-line,
 * so the marker doesn't sit on the cut and look like a trailhead.
 */
export function markerPointSql(): SQL {
  return sql`(case when cut.line is not null then ST_LineInterpolatePoint(shown.line, 0.5) else ST_StartPoint(shown.line) end)`;
}
