import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { allPeaks } from '@/lib/challenges';

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
  if (climbedOn) {
    await getDb().execute(sql`
      insert into summits (user_id, peak_slug, summited_at, verified)
      values (${userId}, ${peakSlug}, ${climbedOn}::date, false)
    `);
  } else {
    await getDb().execute(sql`
      insert into summits (user_id, peak_slug, summited_at, verified)
      values (${userId}, ${peakSlug}, null, false)
    `);
  }
  return 'added';
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

export async function listClimbs(): Promise<ClimbRow[]> {
  const result = await getDb().execute(sql`
    select s.id::text as id, s.user_id, s.peak_slug,
      case when s.summited_at is null then null else s.summited_at::date::text end as climbed_on,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name,
      u.handle
    from summits s
    join users u on u.id = s.user_id
    where u.role <> 'pending'
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
