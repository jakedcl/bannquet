import { sql, type SQL } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { getDb } from '@/db';
import { allPeaks } from '@/lib/challenges';
import { oneAtATime } from '@/lib/dedupe';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

export async function ensurePeaks(): Promise<void> {
  const peaks = allPeaks();
  if (peaks.length === 0) return;
  const values = peaks.map(
    (peak) => sql`(
      ${peak.slug},
      ${peak.name},
      ${peak.listId},
      ${peak.elevationFt},
      ST_SetSRID(ST_MakePoint(${peak.lng}, ${peak.lat}), 4326)::geography,
      ${peak.note ?? null}
    )`,
  );
  await getDb().execute(sql`
    insert into peaks (slug, name, list, elevation_ft, point, info)
    values ${sql.join(values, sql`, `)}
    on conflict (slug) do update set
      name = excluded.name,
      list = excluded.list,
      elevation_ft = excluded.elevation_ft,
      point = excluded.point,
      info = excluded.info
  `);
}

export async function logClimb(userId: string, peakSlug: string, climbedOn: string | null): Promise<'added' | 'missing'> {
  const known = allPeaks().some((peak) => peak.slug === peakSlug);
  if (!known) return 'missing';
  // A second tap within a few seconds is the same climb, not a new one.
  await oneAtATime('climb', userId, async (tx) => {
    const recent = await tx.execute(sql`
      select 1 from summits
      where user_id = ${userId} and peak_slug = ${peakSlug}
        and created_at > now() - interval '10 seconds'
      limit 1
    `);
    if (asRows(recent).length > 0) return;
    await tx.execute(sql`
      insert into summits (user_id, peak_slug, summited_at, verified)
      values (${userId}, ${peakSlug}, ${climbedOn}::date, false)
    `);
  });
  return 'added';
}

/** A climb links to a route when the same member's route passes this close to the summit. */
export const CLIMB_ROUTE_METERS = 300;

/**
 * Fill in `summits.track_id` where the same member has a route on the climb's
 * date that passes within CLIMB_ROUTE_METERS of the peak, closest route first.
 * Climbs without a date and climbs already linked are left alone.
 * Pass the climb or route that just changed; returns how many climbs it linked.
 */
export async function linkClimbsToRoutes(
  scope: { summitId: string } | { trackId: string } | { userId: string; peakSlug: string },
): Promise<number> {
  const filter = 'summitId' in scope
    ? sql`s.id = ${scope.summitId}::uuid`
    : 'trackId' in scope
      ? sql`t.id = ${scope.trackId}::uuid`
      : sql`s.user_id = ${scope.userId} and s.peak_slug = ${scope.peakSlug}`;
  const result = await getDb().execute(sql`
    update summits as target
    set track_id = match.track_id
    from (
      select distinct on (s.id) s.id as summit_id, t.id as track_id
      from summits s
      join peaks p on p.slug = s.peak_slug
      join tracks t on t.user_id = s.user_id
        and (coalesce(t.started_at, t.created_at) at time zone 'America/New_York')::date = s.summited_at::date
        and ST_DWithin(t.line, p.point, ${CLIMB_ROUTE_METERS})
      where s.track_id is null and s.summited_at is not null and ${filter}
      order by s.id, ST_Distance(t.line, p.point), t.id
    ) as match
    where target.id = match.summit_id and target.track_id is null
    returning target.id::text as id
  `);
  return asRows(result).length;
}

export async function deleteLatestClimb(userId: string, peakSlug: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits
    where id = (
      select id from summits
      where user_id = ${userId} and peak_slug = ${peakSlug}
      order by created_at desc
      limit 1
    )
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

/** The climber or an admin may change the date. `user_id` never changes. */
export async function updateClimbDate(
  id: string,
  climbedOn: string | null,
  actor: { id: string; admin: boolean },
): Promise<boolean> {
  const result = await getDb().execute(sql`
    update summits
    set summited_at = ${climbedOn}::date
    where id = ${id}::uuid and (${actor.admin} or user_id = ${actor.id})
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export async function deleteClimb(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits
    where id = ${id}::uuid
      and (${actor.admin} or user_id = ${actor.id})
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export type ClimbRow = {
  id: string;
  userId: string;
  peakSlug: string;
  climbedOn: string | null;
  name: string;
  handle: string | null;
};

export async function climbedPeakSlugs(userId: string): Promise<Set<string>> {
  const result = await getDb().execute(sql`
    select distinct peak_slug
    from summits
    where user_id = ${userId}
  `);
  return new Set(asRows(result).flatMap((row) => {
    const slug = row.peak_slug == null ? '' : String(row.peak_slug);
    return slug ? [slug] : [];
  }));
}

/** Climbs are read by many pages; writes call updateTag(CLIMBS_TAG) so cached reads refresh right away. */
export const CLIMBS_TAG = 'climbs';

async function selectClimbs(filter?: SQL): Promise<ClimbRow[]> {
  const result = await getDb().execute(sql`
    select s.id::text as id, s.user_id, s.peak_slug,
      case when s.summited_at is null then null else s.summited_at::date::text end as climbed_on,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name,
      u.handle
    from summits s
    join users u on u.id = s.user_id
    where u.role <> 'pending'${filter ? sql` and ${filter}` : sql``}
    order by s.created_at asc
  `);
  return asRows(result).flatMap((row) => {
    const id = row.id == null ? '' : String(row.id);
    const userId = row.user_id == null ? '' : String(row.user_id);
    const peakSlug = row.peak_slug == null ? '' : String(row.peak_slug);
    if (!id || !userId || !peakSlug) return [];
    const climbedOn = row.climbed_on == null || String(row.climbed_on).length === 0 ? null : String(row.climbed_on).slice(0, 10);
    return [{
      id,
      userId,
      peakSlug,
      climbedOn,
      name: row.name == null ? 'Friend' : String(row.name),
      handle: row.handle == null || String(row.handle).length === 0 ? null : String(row.handle),
    }];
  });
}

export async function listClimbs(): Promise<ClimbRow[]> {
  return selectClimbs();
}

/** Only one peak's climbs, cached for an hour or until a climb or profile changes. */
export async function listPeakClimbs(peakSlug: string): Promise<ClimbRow[]> {
  return unstable_cache(
    () => selectClimbs(sql`s.peak_slug = ${peakSlug}`),
    ['peak-climbs-v1', peakSlug],
    { revalidate: 3600, tags: [CLIMBS_TAG] },
  )();
}

export async function summitCountsByUser(): Promise<Array<{ userId: string; listId: string; count: number }>> {
  const result = await getDb().execute(sql`
    select s.user_id, p.list as list_id, count(distinct s.peak_slug)::int as n
    from summits s
    join peaks p on p.slug = s.peak_slug
    group by s.user_id, p.list
  `);
  return asRows(result).flatMap((row) => {
    const userId = row.user_id == null ? '' : String(row.user_id);
    const listId = row.list_id == null ? '' : String(row.list_id);
    const count = Number(row.n);
    if (!userId || !listId || !Number.isFinite(count)) return [];
    return [{ userId, listId, count }];
  });
}

export async function summitCountsByActivity(): Promise<Array<{ userId: string; activity: string; count: number }>> {
  const result = await getDb().execute(sql`
    select s.user_id, coalesce(t.activity::text, 'hike') as activity, count(distinct s.peak_slug)::int as n
    from summits s
    left join tracks t on t.id = s.track_id
    group by s.user_id, coalesce(t.activity::text, 'hike')
  `);
  return asRows(result).flatMap((row) => {
    const userId = row.user_id == null ? '' : String(row.user_id);
    const activity = row.activity == null ? '' : String(row.activity);
    const count = Number(row.n);
    if (!userId || !activity || !Number.isFinite(count)) return [];
    return [{ userId, activity, count }];
  });
}
