import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { removePhotoFiles } from '@/lib/blobs';
import { bumpMapCache } from '@/lib/posts';
import { pickAdoptCandidate, type AdoptCandidate } from './adopt';
import { uploadTomvanzPhoto } from './blobs';
import { TOMVANZ_EXTERNAL_SOURCE, TOMVANZ_OWNER_ID } from './constants';
import { isSyncExcluded } from './exclusions';
import {
  elevGainFromGpxXml,
  fittedRenditionSize,
  isPublishedSanityId,
  mapSanityActivity,
  movingSeconds,
  parseSanityImageRef,
  photoAlt,
  photoCaption,
  routePointsFromSanity,
  trackLineWkt,
} from './map';
import { sanityRevIsNewer } from './rev';
import { fetchSanityPhoto, fetchSanityTrack, type SanityPhoto, type SanityTrack } from './sanity';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const next = String(value);
  return next.length > 0 ? next : null;
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type SyncOneOutcome =
  | 'created'
  | 'updated'
  | 'skipped'
  | 'adopted'
  | 'excluded'
  | 'deleted'
  | 'failed';

export type SyncOneResult = { outcome: SyncOneOutcome; detail?: string };

/** Pure gate used before hitting Sanity or the database. */
export function earlySyncGate(sanityId: string, excluded: boolean): SyncOneResult | null {
  if (!isPublishedSanityId(sanityId)) return { outcome: 'skipped', detail: 'Draft or version id.' };
  if (excluded) return { outcome: 'excluded' };
  return null;
}

type SyncedRow = {
  id: string;
  table: 'photos' | 'tracks';
  externalRev: string | null;
  blobUrl?: string | null;
  thumbUrl?: string | null;
};

async function findSyncedRow(sanityId: string): Promise<SyncedRow | null> {
  const db = getDb();
  const [photo, track] = await Promise.all([
    db.execute(sql`
      select id::text as id, external_rev, blob_url, thumb_url
      from photos
      where external_source = ${TOMVANZ_EXTERNAL_SOURCE} and external_id = ${sanityId}
      limit 1
    `),
    db.execute(sql`
      select id::text as id, external_rev
      from tracks
      where external_source = ${TOMVANZ_EXTERNAL_SOURCE} and external_id = ${sanityId}
      limit 1
    `),
  ]);
  const photoRow = asRows(photo)[0];
  if (photoRow?.id) {
    return {
      id: text(photoRow.id)!,
      table: 'photos',
      externalRev: text(photoRow.external_rev),
      blobUrl: text(photoRow.blob_url),
      thumbUrl: text(photoRow.thumb_url),
    };
  }
  const trackRow = asRows(track)[0];
  if (trackRow?.id) {
    return {
      id: text(trackRow.id)!,
      table: 'tracks',
      externalRev: text(trackRow.external_rev),
    };
  }
  return null;
}

async function deleteSyncedRow(row: SyncedRow, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  const db = getDb();
  if (row.table === 'photos') {
    await db.execute(sql`delete from photos where id = ${row.id}::uuid`);
    await removePhotoFiles([row.blobUrl, row.thumbUrl]);
  } else {
    await db.execute(sql`delete from tracks where id = ${row.id}::uuid`);
  }
  bumpMapCache();
}

async function loadTrackAdoptCandidates(): Promise<AdoptCandidate[]> {
  const result = await getDb().execute(sql`
    select
      t.id::text as id,
      t.user_id,
      t.distance_m,
      (t.external_source is not null and t.external_id is not null) as external_linked,
      ST_Y(ST_StartPoint(t.line::geometry)) as lat,
      ST_X(ST_StartPoint(t.line::geometry)) as lng
    from tracks t
    where t.user_id = ${TOMVANZ_OWNER_ID}
  `);
  return asRows(result).flatMap((row) => {
    const lat = num(row.lat);
    const lng = num(row.lng);
    const distanceM = num(row.distance_m);
    const ownerId = text(row.user_id);
    if (lat == null || lng == null || distanceM == null || !ownerId) return [];
    return [{
      id: text(row.id)!,
      lat,
      lng,
      distanceM: Math.round(distanceM),
      ownerId,
      externalLinked: Boolean(row.external_linked),
    }];
  });
}

async function syncPhoto(doc: SanityPhoto, dryRun: boolean): Promise<SyncOneResult> {
  const assetRef = doc.image?.asset?._ref;
  const parsed = parseSanityImageRef(assetRef ?? null);
  if (!parsed) return { outcome: 'failed', detail: 'Photo has no image asset.' };

  const existing = await findSyncedRow(doc._id);
  if (existing && !sanityRevIsNewer(existing.externalRev, doc._updatedAt)) {
    return { outcome: 'skipped' };
  }

  const caption = photoCaption(doc.title, doc.note);
  const alt = photoAlt(doc.title);
  const takenAt = doc.takenAt ?? null;
  const lat = doc.location?.lat;
  const lng = doc.location?.lng;
  const hasPoint = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const origW = num(doc.dimensions?.width) ?? parsed.width;
  const origH = num(doc.dimensions?.height) ?? parsed.height;
  const fitted = fittedRenditionSize(origW, origH);

  if (dryRun) {
    return { outcome: existing ? 'updated' : 'created' };
  }

  const urls = await uploadTomvanzPhoto(assetRef!, parsed.hash, false);

  const db = getDb();
  if (existing) {
    await db.execute(sql`
      update photos set
        blob_url = ${urls.blobUrl},
        thumb_url = ${urls.thumbUrl},
        width = ${fitted.width},
        height = ${fitted.height},
        taken_at = ${takenAt}::timestamptz,
        caption = ${caption},
        alt = ${alt},
        point = ${hasPoint ? sql`ST_SetSRID(ST_MakePoint(${lng!}, ${lat!}), 4326)::geography` : null},
        point_source = ${hasPoint ? 'manual' : null},
        pin_id = null,
        external_rev = ${doc._updatedAt}
      where id = ${existing.id}::uuid
    `);
    bumpMapCache();
    return { outcome: 'updated' };
  }

  await db.execute(sql`
    insert into photos (
      user_id, blob_url, thumb_url, width, height, taken_at, point, point_source,
      caption, alt, pin_id, external_source, external_id, external_rev
    ) values (
      ${TOMVANZ_OWNER_ID},
      ${urls.blobUrl},
      ${urls.thumbUrl},
      ${fitted.width},
      ${fitted.height},
      ${takenAt}::timestamptz,
      ${hasPoint ? sql`ST_SetSRID(ST_MakePoint(${lng!}, ${lat!}), 4326)::geography` : null},
      ${hasPoint ? 'manual' : null},
      ${caption},
      ${alt},
      null,
      ${TOMVANZ_EXTERNAL_SOURCE},
      ${doc._id},
      ${doc._updatedAt}
    )
  `);
  if (hasPoint) bumpMapCache();
  return { outcome: 'created' };
}

async function syncTrack(doc: SanityTrack, dryRun: boolean): Promise<SyncOneResult> {
  const activity = mapSanityActivity(doc.activity);
  if (activity === 'skip') {
    return { outcome: 'failed', detail: `Skipped activity "${doc.activity ?? 'unknown'}".` };
  }

  const coordinatesJson = doc.route?.coordinates;
  if (!coordinatesJson) return { outcome: 'failed', detail: 'Track has no route coordinates.' };

  let points;
  try {
    points = routePointsFromSanity(coordinatesJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid route coordinates.';
    return { outcome: 'failed', detail: message };
  }

  const wkt = trackLineWkt(points);
  if (!wkt) return { outcome: 'failed', detail: 'Could not build route line.' };

  const distanceM = Math.round(num(doc.distanceMeters) ?? 0);
  const title = doc.title?.trim() || 'Route';
  const startedAt = doc.startedAt ?? null;
  const movingS = movingSeconds(doc.startedAt, doc.endedAt);

  let elevGainM: number | null = null;
  if (doc.fileUrl) {
    try {
      const gpxRes = await fetch(doc.fileUrl);
      if (gpxRes.ok) elevGainM = elevGainFromGpxXml(await gpxRes.text());
    } catch {
      elevGainM = null;
    }
  }

  const existing = await findSyncedRow(doc._id);
  if (existing && !sanityRevIsNewer(existing.externalRev, doc._updatedAt)) {
    return { outcome: 'skipped' };
  }

  const start = points[0]!;
  const adoptCandidates = await loadTrackAdoptCandidates();
  const adopt = pickAdoptCandidate(adoptCandidates, {
    lat: start.lat,
    lng: start.lng,
    distanceM,
    ownerId: TOMVANZ_OWNER_ID,
  });

  if (adopt && !existing) {
    if (dryRun) return { outcome: 'adopted', detail: adopt.id };
    await getDb().execute(sql`
      update tracks set
        external_source = ${TOMVANZ_EXTERNAL_SOURCE},
        external_id = ${doc._id},
        external_rev = ${doc._updatedAt},
        title = ${title},
        name = ${title},
        activity = ${activity}::activity,
        line = ST_GeogFromText(${wkt}),
        distance_m = ${distanceM},
        elev_gain_m = ${elevGainM},
        moving_s = ${movingS},
        started_at = ${startedAt}::timestamptz,
        hide_ends = false
      where id = ${adopt.id}::uuid
    `);
    bumpMapCache();
    return { outcome: 'adopted', detail: adopt.id };
  }

  if (dryRun) return { outcome: existing ? 'updated' : 'created' };

  const db = getDb();
  if (existing) {
    await db.execute(sql`
      update tracks set
        name = ${title},
        title = ${title},
        activity = ${activity}::activity,
        line = ST_GeogFromText(${wkt}),
        distance_m = ${distanceM},
        elev_gain_m = ${elevGainM},
        moving_s = ${movingS},
        started_at = ${startedAt}::timestamptz,
        hide_ends = false,
        external_rev = ${doc._updatedAt}
      where id = ${existing.id}::uuid
    `);
    bumpMapCache();
    return { outcome: 'updated' };
  }

  await db.execute(sql`
    insert into tracks (
      user_id, source, name, title, activity, line, distance_m, elev_gain_m, moving_s,
      started_at, hide_ends, external_source, external_id, external_rev
    ) values (
      ${TOMVANZ_OWNER_ID},
      'gpx',
      ${title},
      ${title},
      ${activity}::activity,
      ST_GeogFromText(${wkt}),
      ${distanceM},
      ${elevGainM},
      ${movingS},
      ${startedAt}::timestamptz,
      false,
      ${TOMVANZ_EXTERNAL_SOURCE},
      ${doc._id},
      ${doc._updatedAt}
    )
  `);
  bumpMapCache();
  return { outcome: 'created' };
}

export async function syncOne(sanityId: string, options: { dryRun?: boolean } = {}): Promise<SyncOneResult> {
  const dryRun = options.dryRun ?? false;

  const early = earlySyncGate(sanityId, await isSyncExcluded(TOMVANZ_EXTERNAL_SOURCE, sanityId));
  if (early) return early;

  const photoOnly = await fetchSanityPhoto(sanityId);
  if (photoOnly?._id) return syncPhoto(photoOnly, dryRun);

  const trackOnly = await fetchSanityTrack(sanityId);
  if (trackOnly?._id) return syncTrack(trackOnly, dryRun);

  const existing = await findSyncedRow(sanityId);
  if (existing) {
    await deleteSyncedRow(existing, dryRun);
    return { outcome: 'deleted' };
  }

  return { outcome: 'skipped', detail: 'No published Sanity doc.' };
}
