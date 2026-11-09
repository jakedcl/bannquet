import { sql } from 'drizzle-orm';
import { unstable_cache, updateTag } from 'next/cache';
import { getDb } from '@/db';
import { isActivity, mapColorForActivity, type Activity } from '@/lib/activities';
import { lineWkt, type PackedTrack } from '@/lib/gpx';
import { routeTitle } from '@/lib/route-title';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { NEUTRAL_PIN_COLOR } from '@/lib/map';
import { isLatLng, isPublicBlobUrl } from '@/lib/photos';
import { oneAtATime } from '@/lib/dedupe';
import { markerPointSql, routeCutSql, shownLineSql } from '@/lib/route-privacy-sql';
import { zoneRadiusAtZoom0 } from '@/lib/route-privacy';

export type MapFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: [number, number][] };
    properties: Record<string, string | number | null>;
  }>;
};

export type PreparedPhoto = {
  url: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  lat: number | null;
  lng: number | null;
  source: 'exif' | 'manual' | null;
};

/** A photo's location is optional. Photos without one stay off the maps. */
export function parseUploadedPhotos(raw: string): { photos: PreparedPhoto[]; error: string | null } {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    return { photos: [], error: 'Those photos did not come through. Try them again.' };
  }
  if (!Array.isArray(parsed)) return { photos: [], error: 'Those photos did not come through. Try them again.' };
  if (parsed.length > 12) return { photos: [], error: 'Keep it to 12 photos.' };

  const photos: PreparedPhoto[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : '';
    if (!isPublicBlobUrl(url)) return { photos: [], error: 'One photo was not stored. Try it again.' };
    const lat = typeof record.lat === 'number' ? record.lat : null;
    const lng = typeof record.lng === 'number' ? record.lng : null;
    const located = lat != null && lng != null && isLatLng(lat, lng);
    const source = record.source === 'exif' || record.source === 'manual' ? record.source : 'manual';
    const thumbRaw = typeof record.thumbUrl === 'string' ? record.thumbUrl : '';
    const thumbUrl = thumbRaw && isPublicBlobUrl(thumbRaw) ? thumbRaw : null;
    photos.push({
      url,
      thumbUrl,
      width: photoSide(record.width),
      height: photoSide(record.height),
      lat: located ? lat : null,
      lng: located ? lng : null,
      source: located ? source : null,
    });
  }
  return { photos, error: null };
}

/** Pixel size from the browser. Anything that isn't a sane whole number is stored as unknown. */
function photoSide(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 20_000 ? value : 0;
}

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as QueryRows).rows;
  return rows ?? [];
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

/** Faded circles over the cut ends of a hidden-ends route. Drawn on the routes layer as points. */
function hiddenZones(start: unknown, end: unknown, trackId: string): MapFeatureCollection['features'] {
  return [start, end].flatMap((raw) => {
    const json = text(raw);
    if (!json) return [];
    try {
      const point = JSON.parse(json) as { type: string; coordinates: [number, number] };
      if (point.type !== 'Point') return [];
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: point.coordinates },
        properties: { kind: 'hidden-end', trackId, zoneRadius: zoneRadiusAtZoom0(point.coordinates[1]) },
      }];
    } catch {
      return [];
    }
  });
}

function colorFor(activity: string | null): string {
  return activity && isActivity(activity) ? mapColorForActivity(activity) : NEUTRAL_PIN_COLOR;
}

function whoSql(aliasUser: string) {
  return sql.raw(
    `coalesce(nullif(${aliasUser}.display_name, ''), nullif(${aliasUser}.handle, ''), 'Friend')`,
  );
}

export type MapData = { points: MapFeatureCollection; lines: MapFeatureCollection };

/** Full-map reads are cached; track, pin, and photo writes call bumpMapCache(). */
export const MAP_TAG = 'map';

export function bumpMapCache(): void {
  updateTag(MAP_TAG);
}

/** How far around one item a small map reaches. */
export const NEAR_MAP_METERS = 25_000;

/** What a small map is centred on: a point (photo, pin) or a whole route. */
export type MapAnchor = { lng: number; lat: number } | { routeId: string };

function anchorSql(anchor: MapAnchor) {
  return 'routeId' in anchor
    ? sql`(select line from tracks where id = ${anchor.routeId}::uuid)`
    : sql`ST_SetSRID(ST_MakePoint(${anchor.lng}, ${anchor.lat}), 4326)::geography`;
}

async function viewerOwnsHiddenEnds(viewerId: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    select 1 from tracks where user_id = ${viewerId} and hide_ends limit 1
  `);
  return asRows(result).length > 0;
}

const loadCachedPublicMapData = unstable_cache(
  async () => selectMapData(null, null, true),
  ['map-data-v3'],
  { tags: [MAP_TAG] },
);

/** `viewerId` decides who gets a hidden-ends route in full: only its owner. */
export async function loadMapData(viewerId: string | null): Promise<MapData> {
  if (viewerId && await viewerOwnsHiddenEnds(viewerId)) {
    return selectMapData(viewerId, null, false);
  }
  return loadCachedPublicMapData();
}

/** Only what sits within `radiusM` of the anchor, for the small map on an item page. */
export async function loadMapDataNear(
  viewerId: string | null,
  anchor: MapAnchor,
  radiusM = NEAR_MAP_METERS,
): Promise<MapData> {
  return selectMapData(viewerId, { anchor, radiusM }, false);
}

function routeLineGeoJsonSql(simplify: boolean) {
  return simplify
    ? sql`ST_AsGeoJSON(ST_Simplify(shown.line::geometry, 0.00005), 5)`
    : sql`ST_AsGeoJSON(shown.line)`;
}

async function selectMapData(
  viewerId: string | null,
  near: { anchor: MapAnchor; radiusM: number } | null,
  simplifyLines: boolean,
): Promise<MapData> {
  const db = getDb();
  // Routes test both the stored line (uses the index) and the part this viewer may see.
  const within = (column: string) => near
    ? sql` and ST_DWithin(${sql.raw(column)}, ${anchorSql(near.anchor)}, ${near.radiusM})`
    : sql``;
  const [trackResult, photoResult, pinResult] = await Promise.all([
    db.execute(sql`
      select t.id::text as id, t.title, t.activity::text as activity,
        (coalesce(t.started_at, t.created_at) at time zone 'America/New_York')::date::text as trip_date,
        ${whoSql('u')} as who,
        ${routeLineGeoJsonSql(simplifyLines)} as geojson,
        ST_Y(${markerPointSql()}) as lat,
        ST_X(${markerPointSql()}) as lng,
        ST_AsGeoJSON(ST_StartPoint(cut.line)) as zone_start,
        ST_AsGeoJSON(ST_EndPoint(cut.line)) as zone_end
      from tracks t
      left join users u on u.id = t.user_id
      cross join lateral (${routeCutSql()}) cut
      cross join lateral (select ${shownLineSql(viewerId)} as line) shown
      where true${within('t.line')}${within('shown.line::geography')}
    `),
    db.execute(sql`
      select p.id::text as id, coalesce(p.caption, p.alt, 'Photo') as title,
        null::text as activity,
        p.taken_at::date::text as trip_date,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from photos p
      left join users u on u.id = p.user_id
      where p.point is not null and p.pin_id is null${within('p.point')}
    `),
    db.execute(sql`
      select p.id::text as id, p.title, p.activity::text as activity, p.kind::text as kind,
        p.visited_on::text as trip_date,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from pins p
      left join users u on u.id = p.created_by
      where true${within('p.point')}
    `),
  ]);

  const tracks = asRows(trackResult);
  const points: MapFeatureCollection['features'] = [];
  const lines: MapFeatureCollection['features'] = [];

  for (const row of tracks) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    const activity = text(row.activity);
    if (!id || lat == null || lng == null) continue;
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'route',
        title: routeTitle(text(row.title)),
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        color: colorFor(activity),
        trackId: id,
        href: `/routes/${id}`,
      },
    });
    const geojson = text(row.geojson);
    if (!geojson) continue;
    try {
      const geometry = JSON.parse(geojson) as { type: 'LineString'; coordinates: [number, number][] };
      if (geometry.type !== 'LineString') continue;
      lines.push({
        type: 'Feature',
        geometry,
        properties: {
          trackId: id,
          color: colorFor(activity),
          title: routeTitle(text(row.title)),
          who: text(row.who) ?? 'Friend',
          date: text(row.trip_date),
          activity,
          category: '',
          href: `/routes/${id}`,
        },
      });
    } catch {
      continue;
    }
    lines.push(...hiddenZones(row.zone_start, row.zone_end, id));
  }

  for (const row of asRows(photoResult)) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    if (!id || lat == null || lng == null) continue;
    const activity = text(row.activity);
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'photo',
        title: text(row.title) ?? 'Photo',
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        color: colorFor(activity),
        trackId: '',
        href: `/photos/${id}`,
      },
    });
  }

  for (const row of asRows(pinResult)) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    if (!id || lat == null || lng == null) continue;
    const activity = text(row.activity);
    const kind = text(row.kind);
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'pin',
        title: text(row.title) ?? 'Pin',
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        category: kind && isPinKind(kind) ? PIN_KIND_LABELS[kind] : '',
        color: colorFor(activity),
        trackId: '',
        href: `/pins/${id}`,
      },
    });
  }

  return {
    points: { type: 'FeatureCollection', features: points },
    lines: { type: 'FeatureCollection', features: lines },
  };
}

export async function addProfileTrack(input: {
  userId: string;
  activity: Activity;
  track: PackedTrack;
  title?: string | null;
  notes?: string | null;
  hideEnds?: boolean;
}): Promise<string> {
  const wkt = lineWkt(input.track.points);
  if (!wkt) throw new Error('That GPX needs at least two points.');
  // A repeat submit of the same GPX returns the route that's already saved.
  return oneAtATime('track', input.userId, async (tx) => {
    const existing = await tx.execute(sql`
      select id::text as id from tracks
      where user_id = ${input.userId}
        and ST_Equals(line::geometry, ST_GeogFromText(${wkt})::geometry)
      limit 1
    `);
    const existingId = text(asRows(existing)[0]?.id);
    if (existingId) return existingId;
    const inserted = await tx.execute(sql`
      insert into tracks (user_id, source, name, title, notes, activity, line, distance_m, elev_gain_m, started_at, hide_ends)
      values (
        ${input.userId},
        'gpx',
        ${input.track.name || 'Route'},
        ${input.title ?? null},
        ${input.notes ?? null},
        ${input.activity}::activity,
        ST_GeogFromText(${wkt}),
        ${input.track.distanceM},
        ${input.track.elevGainM},
        coalesce(${input.track.startedAt ?? null}::timestamptz, now()),
        ${input.hideEnds ?? false}
      )
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (!id) throw new Error('Could not save that route.');
    bumpMapCache();
    return id;
  });
}

export async function addProfilePhotos(
  input: { userId: string; photos: PreparedPhoto[] },
): Promise<Array<{ id: string; url: string; thumbUrl: string | null }>> {
  const db = getDb();
  const saved: Array<{ id: string; url: string; thumbUrl: string | null }> = [];
  for (const [index, photo] of input.photos.entries()) {
    if (!isPublicBlobUrl(photo.url)) continue;
    const located = photo.lat != null && photo.lng != null && isLatLng(photo.lat, photo.lng);
    // A repeat submit of the same upload returns the row that already exists.
    const existing = await db.execute(sql`
      select id::text as id, thumb_url from photos
      where user_id = ${input.userId} and blob_url = ${photo.url}
      limit 1
    `);
    const existingId = text(asRows(existing)[0]?.id);
    if (existingId) {
      saved.push({ id: existingId, url: photo.url, thumbUrl: text(asRows(existing)[0]?.thumb_url) });
      continue;
    }
    const inserted = await db.execute(sql`
      insert into photos (user_id, blob_url, thumb_url, width, height, point, point_source, sort_order, alt)
      values (
        ${input.userId},
        ${photo.url},
        ${photo.thumbUrl},
        ${photo.width || null},
        ${photo.height || null},
        ${located ? sql`ST_SetSRID(ST_MakePoint(${photo.lng}, ${photo.lat}), 4326)::geography` : null},
        ${located ? photo.source : null},
        ${index},
        'Photo'
      )
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (id) {
      saved.push({ id, url: photo.url, thumbUrl: photo.thumbUrl });
      if (located) bumpMapCache();
    }
  }
  return saved;
}

export type ProfileLibrary = {
  routes: Array<{ id: string; name: string; activity: string; distanceM: number | null; elevGainM: number | null; date: string | null}>;
  photos: Array<{ id: string; url: string; thumbUrl: string | null; caption: string | null; pinId: string | null }>;
};

export async function loadProfileLibrary(userId: string): Promise<ProfileLibrary> {
  const db = getDb();
  const [routes, photos] = await Promise.all([
    db.execute(sql`
      select id::text as id, title, activity::text as activity, distance_m, elev_gain_m,
        (coalesce(started_at, created_at) at time zone 'America/New_York')::date::text as route_date
      from tracks
      where user_id = ${userId}
      order by started_at desc nulls last, created_at desc
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, thumb_url as thumb_url, caption, pin_id::text as pin_id
      from photos
      where user_id = ${userId}
      order by created_at desc
    `),
  ]);

  return {
    routes: asRows(routes).flatMap((row) => {
      const id = text(row.id);
      const activity = text(row.activity);
      if (!id || !activity) return [];
      return [{
        id,
        name: routeTitle(text(row.title)),
        activity,
        distanceM: num(row.distance_m),
        elevGainM: num(row.elev_gain_m),
        date: text(row.route_date),
      }];
    }),
    photos: asRows(photos).flatMap((row) => {
      const id = text(row.id);
      const url = text(row.url);
      if (!id || !url) return [];
      return [{
        id,
        url,
        thumbUrl: text(row.thumb_url),
        caption: text(row.caption),
        pinId: text(row.pin_id),
      }];
    }),
  };
}
