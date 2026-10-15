import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { isActivity, mapColorForActivity, type Activity } from '@/lib/activities';
import { lineWkt, type PackedTrack } from '@/lib/gpx';
import { routeTitle } from '@/lib/route-title';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { NEUTRAL_PIN_COLOR } from '@/lib/map';
import { isLatLng, isPublicBlobUrl } from '@/lib/photos';

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
  width: number;
  height: number;
  lat: number | null;
  lng: number | null;
  source: 'exif' | 'manual' | null;
};

export function parseUploadedPhotos(
  raw: string,
  options: { requireLocation?: boolean } = {},
): { photos: PreparedPhoto[]; error: string | null } {
  const requireLocation = options.requireLocation !== false;
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
    if (requireLocation && !located) {
      return { photos: [], error: 'A photo has no location. Drop a pin on the map, or remove it.' };
    }
    const source = record.source === 'exif' || record.source === 'manual' ? record.source : 'manual';
    photos.push({
      url,
      width: typeof record.width === 'number' ? record.width : 0,
      height: typeof record.height === 'number' ? record.height : 0,
      lat: located ? lat : null,
      lng: located ? lng : null,
      source: located ? source : null,
    });
  }
  return { photos, error: null };
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

function colorFor(activity: string | null): string {
  return activity && isActivity(activity) ? mapColorForActivity(activity) : NEUTRAL_PIN_COLOR;
}

function whoSql(aliasUser: string) {
  return sql.raw(
    `coalesce(nullif(${aliasUser}.display_name, ''), nullif(${aliasUser}.handle, ''), 'Friend')`,
  );
}

export async function loadMapData(): Promise<{ points: MapFeatureCollection; lines: MapFeatureCollection }> {
  const db = getDb();
  const [trackResult, photoResult, tripResult, pinResult] = await Promise.all([
    db.execute(sql`
      select t.id::text as id, t.title, t.activity::text as activity,
        t.started_at::date::text as trip_date,
        ${whoSql('u')} as who,
        ST_AsGeoJSON(t.line::geometry) as geojson,
        ST_Y(ST_StartPoint(t.line::geometry)) as lat,
        ST_X(ST_StartPoint(t.line::geometry)) as lng
      from tracks t
      left join users u on u.id = t.user_id
    `),
    db.execute(sql`
      select p.id::text as id, coalesce(p.caption, p.alt, 'Photo') as title,
        null::text as activity,
        p.taken_at::date::text as trip_date,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from photos p
      left join users u on u.id = p.user_id
      where p.point is not null and p.pin_id is null
    `),
    db.execute(sql`
      select t.id::text as id, t.title, t.start_at::date::text as trip_date, t.activity::text as activity,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(t.trailhead_point::geometry) as lat, ST_X(t.trailhead_point::geometry) as lng
      from trips t
      left join users u on u.id = t.created_by
      where t.trailhead_point is not null
    `),
    db.execute(sql`
      select p.id::text as id, p.title, p.activity::text as activity, p.kind::text as kind,
        p.visited_on::text as trip_date,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from pins p
      left join users u on u.id = p.created_by
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

  for (const row of asRows(tripResult)) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    if (!id || lat == null || lng == null) continue;
    const activity = text(row.activity);
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'trip',
        title: text(row.title) ?? 'Trip',
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        color: colorFor(activity),
        trackId: '',
        href: `/trips/${id}`,
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
}): Promise<string> {
  const wkt = lineWkt(input.track.points);
  if (!wkt) throw new Error('That GPX needs at least two points.');
  const inserted = await getDb().execute(sql`
    insert into tracks (user_id, source, name, title, activity, line, distance_m, elev_gain_m, started_at)
    values (
      ${input.userId},
      'gpx',
      ${input.track.name || 'Route'},
      ${input.title ?? null},
      ${input.activity}::activity,
      ST_GeogFromText(${wkt}),
      ${input.track.distanceM},
      ${input.track.elevGainM},
      now()
    )
    returning id::text as id
  `);
  const id = text(asRows(inserted)[0]?.id);
  if (!id) throw new Error('Could not save that route.');
  return id;
}

export async function addProfilePhotos(input: { userId: string; photos: PreparedPhoto[] }): Promise<Array<{ id: string; url: string }>> {
  const db = getDb();
  const saved: Array<{ id: string; url: string }> = [];
  for (const [index, photo] of input.photos.entries()) {
    if (!isPublicBlobUrl(photo.url) || photo.lat == null || photo.lng == null || !isLatLng(photo.lat, photo.lng)) {
      continue;
    }
    const inserted = await db.execute(sql`
      insert into photos (user_id, blob_url, width, height, point, point_source, sort_order, alt)
      values (
        ${input.userId},
        ${photo.url},
        ${photo.width || null},
        ${photo.height || null},
        ST_SetSRID(ST_MakePoint(${photo.lng}, ${photo.lat}), 4326)::geography,
        ${photo.source},
        ${index},
        'Photo'
      )
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (id) saved.push({ id, url: photo.url });
  }
  return saved;
}

export type ProfileLibrary = {
  posts: Array<{ id: string; title: string; tripDate: string | null; activity: string | null; tagged: boolean }>;
  routes: Array<{ id: string; name: string; activity: string; distanceM: number | null; elevGainM: number | null; postId: string | null }>;
  photos: Array<{ id: string; url: string; caption: string | null; postId: string | null; pinId: string | null }>;
};

export async function loadProfileLibrary(userId: string): Promise<ProfileLibrary> {
  const db = getDb();
  const [routes, photos] = await Promise.all([
    db.execute(sql`
      select id::text as id, title, activity::text as activity, distance_m, elev_gain_m
      from tracks
      where user_id = ${userId}
      order by started_at desc nulls last, created_at desc
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, caption, pin_id::text as pin_id
      from photos
      where user_id = ${userId}
      order by created_at desc
    `),
  ]);

  return {
    posts: [],
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
        postId: null,
      }];
    }),
    photos: asRows(photos).flatMap((row) => {
      const id = text(row.id);
      const url = text(row.url);
      if (!id || !url) return [];
      return [{ id, url, caption: text(row.caption), postId: null, pinId: text(row.pin_id) }];
    }),
  };
}
