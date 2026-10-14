import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { allPeaks, peaksNearTrack, type ChallengePeak } from '@/lib/challenges';
import type { TrackPoint } from '@/lib/gpx';

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
      ST_SetSRID(ST_MakePoint(${peak.lng}, ${peak.lat}), 4326)::geography
    )`,
  );
  await getDb().execute(sql`
    insert into peaks (slug, name, list, elevation_ft, point)
    values ${sql.join(values, sql`, `)}
    on conflict (slug) do update set
      name = excluded.name,
      list = excluded.list,
      elevation_ft = excluded.elevation_ft,
      point = excluded.point
  `);
}

export async function creditTrackSummits(input: {
  userId: string;
  trackId: string;
  points: TrackPoint[];
  summitedAt: string;
}): Promise<string[]> {
  const peaks: ChallengePeak[] = allPeaks();
  const slugs = peaksNearTrack(input.points, peaks);
  if (slugs.length === 0) return [];
  const names = new Map(peaks.map((peak) => [peak.slug, peak.name]));
  const values = slugs.map(
    (slug) => sql`(
      ${input.userId},
      ${slug},
      ${input.summitedAt}::timestamptz,
      ${input.trackId}::uuid,
      true
    )`,
  );
  await getDb().execute(sql`
    insert into summits (user_id, peak_slug, summited_at, track_id, verified)
    values ${sql.join(values, sql`, `)}
    on conflict (user_id, peak_slug) do update set
      track_id = coalesce(summits.track_id, excluded.track_id),
      verified = summits.verified or excluded.verified
  `);
  return slugs.map((slug) => names.get(slug) ?? slug);
}

export async function toggleManualSummit(userId: string, peakSlug: string): Promise<'added' | 'removed' | 'missing'> {
  const known = allPeaks().some((peak) => peak.slug === peakSlug);
  if (!known) return 'missing';
  const db = getDb();
  const existing = await db.execute(sql`
    select id::text as id from summits where user_id = ${userId} and peak_slug = ${peakSlug} limit 1
  `);
  if (asRows(existing).length > 0) {
    await db.execute(sql`delete from summits where user_id = ${userId} and peak_slug = ${peakSlug}`);
    return 'removed';
  }
  await db.execute(sql`
    insert into summits (user_id, peak_slug, summited_at, verified)
    values (${userId}, ${peakSlug}, now(), false)
  `);
  return 'added';
}

export type SummitCredit = {
  peakSlug: string;
  fromRoute: boolean;
};

export async function listSummitCredits(userId: string): Promise<SummitCredit[]> {
  const result = await getDb().execute(sql`
    select peak_slug, track_id::text as track_id
    from summits
    where user_id = ${userId}
  `);
  return asRows(result).flatMap((row) => {
    const peakSlug = row.peak_slug == null ? '' : String(row.peak_slug);
    if (!peakSlug) return [];
    return [{ peakSlug, fromRoute: row.track_id != null && String(row.track_id).length > 0 }];
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
