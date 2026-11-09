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

/**
 * Copies config/challenges/*.json into the `peaks` table. That table only exists
 * so `summits.peak_slug` has a foreign key; the JSON stays the source of truth.
 */
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
    where peaks.name is distinct from excluded.name
      or peaks.list is distinct from excluded.list
      or peaks.elevation_ft is distinct from excluded.elevation_ft
      or peaks.point is distinct from excluded.point
      or peaks.info is distinct from excluded.info
  `);
}

/** Log one more time a member has been up a peak. Each visit is its own row. */
export async function addPeak(userId: string, peakSlug: string): Promise<'added' | 'missing'> {
  const known = allPeaks().some((peak) => peak.slug === peakSlug);
  if (!known) return 'missing';
  return oneAtATime('peak', userId, async (tx) => {
    await tx.execute(sql`
      insert into summits (user_id, peak_slug, verified)
      values (${userId}, ${peakSlug}, false)
    `);
    return 'added' as const;
  });
}

/** Take the member's most recent visit to a peak off their peaks. */
export async function removePeak(userId: string, peakSlug: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits
    where id = (
      select id from summits
      where user_id = ${userId} and peak_slug = ${peakSlug}
      order by created_at desc, id desc
      limit 1
    )
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

/**
 * The member or an admin may take one visit off that member's peaks: the most
 * recent visit to the same peak as the picked row.
 */
export async function deletePeakRow(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits
    where id = (
      select s.id from summits s
      join summits picked on picked.user_id = s.user_id and picked.peak_slug = s.peak_slug
      where picked.id = ${id}::uuid
        and (${actor.admin} or picked.user_id = ${actor.id})
      order by s.created_at desc, s.id desc
      limit 1
    )
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export type PeakRow = {
  id: string;
  userId: string;
  peakSlug: string;
  name: string;
  handle: string | null;
  /** How many times this member has been up this peak. */
  count: number;
};

export async function memberPeakSlugs(userId: string): Promise<Set<string>> {
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

/** Peaks are read by many pages; writes call updateTag(PEAKS_TAG) so cached reads refresh right away. */
export const PEAKS_TAG = 'peaks';

/** One row per member per peak (oldest visit first), with how many visits they logged. */
async function selectPeakRows(filter?: SQL): Promise<PeakRow[]> {
  const result = await getDb().execute(sql`
    select * from (
      select distinct on (s.user_id, s.peak_slug)
        s.id::text as id, s.user_id, s.peak_slug, s.created_at,
        count(*) over (partition by s.user_id, s.peak_slug)::int as visits,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name,
        u.handle
      from summits s
      join users u on u.id = s.user_id
      where u.role <> 'pending'${filter ? sql` and ${filter}` : sql``}
      order by s.user_id, s.peak_slug, s.created_at asc
    ) as rows
    order by created_at asc
  `);
  return asRows(result).flatMap((row) => {
    const id = row.id == null ? '' : String(row.id);
    const userId = row.user_id == null ? '' : String(row.user_id);
    const peakSlug = row.peak_slug == null ? '' : String(row.peak_slug);
    if (!id || !userId || !peakSlug) return [];
    return [{
      id,
      userId,
      peakSlug,
      name: row.name == null ? 'Friend' : String(row.name),
      handle: row.handle == null || String(row.handle).length === 0 ? null : String(row.handle),
      count: Math.max(1, Number(row.visits) || 1),
    }];
  });
}

export async function listPeakRows(): Promise<PeakRow[]> {
  return selectPeakRows();
}

/** Who has been to one peak, cached for an hour or until someone's peaks or profile change. */
export async function listPeakVisitors(peakSlug: string): Promise<PeakRow[]> {
  return unstable_cache(
    () => selectPeakRows(sql`s.peak_slug = ${peakSlug}`),
    ['peak-visitors-v2', peakSlug],
    { revalidate: 3600, tags: [PEAKS_TAG] },
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
