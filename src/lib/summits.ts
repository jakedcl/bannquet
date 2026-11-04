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
  `);
}

/**
 * Add a peak to a member's peaks. A member has at most one row per peak, so a
 * second tap (or a peak already on the list) changes nothing.
 */
export async function addPeak(userId: string, peakSlug: string): Promise<'added' | 'missing'> {
  const known = allPeaks().some((peak) => peak.slug === peakSlug);
  if (!known) return 'missing';
  return oneAtATime('peak', userId, async (tx) => {
    await tx.execute(sql`
      insert into summits (user_id, peak_slug, verified)
      select ${userId}, ${peakSlug}, false
      where not exists (
        select 1 from summits where user_id = ${userId} and peak_slug = ${peakSlug}
      )
    `);
    return 'added' as const;
  });
}

/** Take a peak off a member's peaks. */
export async function removePeak(userId: string, peakSlug: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits
    where user_id = ${userId} and peak_slug = ${peakSlug}
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

/** The member or an admin may take a peak off that member's peaks. */
export async function deletePeakRow(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from summits s
    using summits picked
    where picked.id = ${id}::uuid
      and s.user_id = picked.user_id and s.peak_slug = picked.peak_slug
      and (${actor.admin} or picked.user_id = ${actor.id})
    returning s.id::text as id
  `);
  return asRows(result).length > 0;
}

export type PeakRow = {
  id: string;
  userId: string;
  peakSlug: string;
  name: string;
  handle: string | null;
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

/** One row per member per peak, oldest first, even if older data still has repeats. */
async function selectPeakRows(filter?: SQL): Promise<PeakRow[]> {
  const result = await getDb().execute(sql`
    select * from (
      select distinct on (s.user_id, s.peak_slug)
        s.id::text as id, s.user_id, s.peak_slug, s.created_at,
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
    ['peak-visitors-v1', peakSlug],
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
