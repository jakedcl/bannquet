import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { isActivity, mapColorForActivity, type Activity } from '@/lib/activities';
import { lineWkt, trackStats, type TrackPoint } from '@/lib/gpx';
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

function whoSql(aliasUser: string, aliasReport: string) {
  return sql.raw(
    `coalesce(nullif(${aliasUser}.display_name, ''), nullif(${aliasUser}.handle, ''), nullif(${aliasReport}.legacy_author_name, ''), 'Friend')`,
  );
}

export async function loadMapData(): Promise<{ points: MapFeatureCollection; lines: MapFeatureCollection }> {
  const db = getDb();
  const [postResult, trackResult, photoResult] = await Promise.all([
    db.execute(sql`
      select tr.id::text as id, tr.title, tr.trip_date::text as trip_date, tr.activity::text as activity,
        ${whoSql('u', 'tr')} as who,
        ST_Y(tr.point::geometry) as lat, ST_X(tr.point::geometry) as lng
      from trip_reports tr
      left join users u on u.id = tr.author_id
      where tr.published = true and tr.point is not null
    `),
    db.execute(sql`
      select t.id::text as id, t.name, t.activity::text as activity, t.trip_report_id::text as post_id,
        coalesce(tr.title, t.name) as title, tr.trip_date::text as trip_date,
        ${whoSql('u', 'tr')} as who,
        ST_AsGeoJSON(t.line::geometry) as geojson,
        ST_Y(ST_StartPoint(t.line::geometry)) as lat,
        ST_X(ST_StartPoint(t.line::geometry)) as lng
      from tracks t
      left join users u on u.id = t.user_id
      left join trip_reports tr on tr.id = t.trip_report_id
    `),
    db.execute(sql`
      select p.id::text as id, coalesce(p.caption, tr.title, 'Photo') as title,
        p.trip_report_id::text as post_id, tr.activity::text as activity,
        coalesce(p.taken_at::date, tr.trip_date)::text as trip_date,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from photos p
      left join users u on u.id = p.user_id
      left join trip_reports tr on tr.id = p.trip_report_id
      where p.point is not null
    `),
  ]);

  const tracks = asRows(trackResult);
  const postsWithRoutes = new Set(tracks.map((row) => text(row.post_id)).filter((id): id is string => Boolean(id)));
  const points: MapFeatureCollection['features'] = [];
  const lines: MapFeatureCollection['features'] = [];

  for (const row of asRows(postResult)) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    if (!id || lat == null || lng == null || postsWithRoutes.has(id)) continue;
    const activity = text(row.activity);
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'post',
        title: text(row.title) ?? 'Post',
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        color: colorFor(activity),
        trackId: '',
        href: `/trip-reports/${id}`,
      },
    });
  }

  for (const row of tracks) {
    const id = text(row.id);
    const lat = num(row.lat);
    const lng = num(row.lng);
    const activity = text(row.activity);
    const postId = text(row.post_id);
    if (!id || lat == null || lng == null) continue;
    const href = postId ? `/trip-reports/${postId}` : `/map?track=${id}`;
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        kind: 'route',
        title: text(row.title) ?? 'Route',
        who: text(row.who) ?? 'Friend',
        date: text(row.trip_date),
        activity,
        color: colorFor(activity),
        trackId: id,
        href,
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
        properties: { trackId: id, color: colorFor(activity), title: text(row.title) ?? 'Route' },
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
    const postId = text(row.post_id);
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
        href: postId ? `/trip-reports/${postId}` : `/map?photo=${id}`,
      },
    });
  }

  return {
    points: { type: 'FeatureCollection', features: points },
    lines: { type: 'FeatureCollection', features: lines },
  };
}

function textArray(values: string[]): string {
  return `{${values.map((value) => `"${value.replace(/"/g, '')}"`).join(',')}}`;
}

function firstPoint(points: TrackPoint[]): { lat: number; lng: number } | null {
  const point = points[0];
  if (!point || !isLatLng(point.lat, point.lng)) return null;
  return { lat: point.lat, lng: point.lng };
}

export async function createPost(input: {
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tripDate: string;
  activity: Activity;
  taggedUserIds: string[];
  track: { name: string | null; points: TrackPoint[] } | null;
  photos: PreparedPhoto[];
}): Promise<string> {
  const start = input.track ? firstPoint(input.track.points) : null;
  const photoPoint = input.photos.find((photo) => photo.lat != null && photo.lng != null && isLatLng(photo.lat, photo.lng));
  const lat = start?.lat ?? photoPoint?.lat ?? null;
  const lng = start?.lng ?? photoPoint?.lng ?? null;
  const db = getDb();

  return db.transaction(async (tx) => {
    const pointSql = lat == null || lng == null
      ? sql`null`
      : sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
    const inserted = await tx.execute(sql`
      insert into trip_reports (
        title, body, trip_date, activity, author_id, legacy_author_name, tagged_user_ids, published, point
      ) values (
        ${input.title},
        ${input.body},
        ${input.tripDate}::date,
        ${input.activity}::activity,
        ${input.authorId},
        ${input.authorName},
        ${textArray(input.taggedUserIds)}::text[],
        true,
        ${pointSql}
      )
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (!id) throw new Error('Could not save that post.');

    if (input.track && input.track.points.length >= 2) {
      const wkt = lineWkt(input.track.points);
      const stats = trackStats(input.track.points);
      if (wkt) {
        await tx.execute(sql`
          insert into tracks (user_id, trip_report_id, source, name, activity, line, distance_m, elev_gain_m, started_at)
          values (
            ${input.authorId},
            ${id}::uuid,
            'gpx',
            ${input.track.name || input.title},
            ${input.activity}::activity,
            ST_GeogFromText(${wkt}),
            ${stats.distanceM},
            ${stats.elevGainM},
            ${input.tripDate}::date
          )
        `);
      }
    }

    for (const [index, photo] of input.photos.entries()) {
      if (!isPublicBlobUrl(photo.url)) continue;
      const hasPoint = photo.lat != null && photo.lng != null && isLatLng(photo.lat, photo.lng);
      const photoPointSql = hasPoint
        ? sql`ST_SetSRID(ST_MakePoint(${photo.lng}, ${photo.lat}), 4326)::geography`
        : sql`null`;
      await tx.execute(sql`
        insert into photos (
          trip_report_id, user_id, blob_url, width, height, point, point_source, sort_order, alt
        ) values (
          ${id}::uuid,
          ${input.authorId},
          ${photo.url},
          ${photo.width || null},
          ${photo.height || null},
          ${photoPointSql},
          ${hasPoint ? photo.source : null},
          ${index},
          ${input.title}
        )
      `);
    }

    return id;
  });
}

export async function addProfileTrack(input: {
  userId: string;
  activity: Activity;
  track: { name: string | null; points: TrackPoint[] };
}): Promise<void> {
  const wkt = lineWkt(input.track.points);
  if (!wkt) throw new Error('That GPX needs at least two points.');
  const stats = trackStats(input.track.points);
  await getDb().execute(sql`
    insert into tracks (user_id, source, name, activity, line, distance_m, elev_gain_m, started_at)
    values (
      ${input.userId},
      'gpx',
      ${input.track.name || 'Route'},
      ${input.activity}::activity,
      ST_GeogFromText(${wkt}),
      ${stats.distanceM},
      ${stats.elevGainM},
      now()
    )
  `);
}

export async function addProfilePhotos(input: { userId: string; photos: PreparedPhoto[] }): Promise<void> {
  const db = getDb();
  for (const [index, photo] of input.photos.entries()) {
    if (!isPublicBlobUrl(photo.url) || photo.lat == null || photo.lng == null || !isLatLng(photo.lat, photo.lng)) {
      continue;
    }
    await db.execute(sql`
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
    `);
  }
}

export type ProfileLibrary = {
  posts: Array<{ id: string; title: string; tripDate: string | null; activity: string | null; tagged: boolean }>;
  routes: Array<{ id: string; name: string; activity: string; distanceM: number | null; elevGainM: number | null; postId: string | null }>;
  photos: Array<{ id: string; url: string; caption: string | null; postId: string | null }>;
};

export async function loadProfileLibrary(userId: string): Promise<ProfileLibrary> {
  const db = getDb();
  const [posts, routes, photos] = await Promise.all([
    db.execute(sql`
      select id::text as id, title, trip_date::text as trip_date, activity::text as activity,
        (${userId} = any(tagged_user_ids) and author_id is distinct from ${userId}) as tagged
      from trip_reports
      where published = true and (author_id = ${userId} or ${userId} = any(tagged_user_ids))
      order by trip_date desc nulls last, created_at desc
    `),
    db.execute(sql`
      select id::text as id, name, activity::text as activity, distance_m, elev_gain_m, trip_report_id::text as post_id
      from tracks
      where user_id = ${userId}
      order by started_at desc nulls last, created_at desc
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, caption, trip_report_id::text as post_id
      from photos
      where user_id = ${userId}
      order by created_at desc
    `),
  ]);

  return {
    posts: asRows(posts).map((row) => ({
      id: text(row.id) ?? '',
      title: text(row.title) ?? 'Post',
      tripDate: text(row.trip_date),
      activity: text(row.activity),
      tagged: row.tagged === true || row.tagged === 't',
    })).filter((row) => row.id),
    routes: asRows(routes).flatMap((row) => {
      const id = text(row.id);
      const activity = text(row.activity);
      if (!id || !activity) return [];
      return [{
        id,
        name: text(row.name) ?? 'Route',
        activity,
        distanceM: num(row.distance_m),
        elevGainM: num(row.elev_gain_m),
        postId: text(row.post_id),
      }];
    }),
    photos: asRows(photos).flatMap((row) => {
      const id = text(row.id);
      const url = text(row.url);
      if (!id || !url) return [];
      return [{ id, url, caption: text(row.caption), postId: text(row.post_id) }];
    }),
  };
}

export async function loadReportTrail(reportId: string): Promise<{
  distanceM: number | null;
  elevGainM: number | null;
  taggedNames: string[];
} | null> {
  const db = getDb();
  const [trackResult, tagResult] = await Promise.all([
    db.execute(sql`
      select distance_m, elev_gain_m
      from tracks
      where trip_report_id = ${reportId}::uuid
      order by created_at asc
      limit 1
    `),
    db.execute(sql`
      select coalesce(nullif(display_name, ''), nullif(handle, ''), 'Friend') as name
      from users
      where id = any(coalesce((select tagged_user_ids from trip_reports where id = ${reportId}::uuid), '{}'))
      order by name
    `),
  ]);
  const track = asRows(trackResult)[0];
  return {
    distanceM: num(track?.distance_m),
    elevGainM: num(track?.elev_gain_m),
    taggedNames: asRows(tagResult).map((row) => text(row.name)).filter((name): name is string => Boolean(name)),
  };
}
