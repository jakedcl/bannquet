import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { isActivity, mapColorForActivity, type Activity } from '@/lib/activities';
import { lineWkt, trackStats, type TrackPoint } from '@/lib/gpx';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { NEUTRAL_PIN_COLOR } from '@/lib/map';
import { isLatLng, isPublicBlobUrl } from '@/lib/photos';
import type { PostKind } from '@/lib/post-kinds';

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

function whoSql(aliasUser: string, aliasReport: string) {
  return sql.raw(
    `coalesce(nullif(${aliasUser}.display_name, ''), nullif(${aliasUser}.handle, ''), nullif(${aliasReport}.legacy_author_name, ''), 'Friend')`,
  );
}

export async function loadMapData(): Promise<{ points: MapFeatureCollection; lines: MapFeatureCollection }> {
  const db = getDb();
  const [postResult, trackResult, photoResult, tripResult, pinResult] = await Promise.all([
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
        href: `/posts/${id}`,
      },
    });
  }

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
        title: text(row.title) ?? 'Route',
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
          title: text(row.title) ?? 'Route',
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

function textArray(values: string[]): string {
  return `{${values.map((value) => `"${value.replace(/"/g, '')}"`).join(',')}}`;
}

function firstPoint(points: TrackPoint[]): { lat: number; lng: number } | null {
  const point = points[0];
  if (!point || !isLatLng(point.lat, point.lng)) return null;
  return { lat: point.lat, lng: point.lng };
}

function photosForKind(kind: PostKind, photos: PreparedPhoto[]): PreparedPhoto[] {
  if (kind === 'trip_report') return photos;
  return photos.map((photo) => ({ ...photo, lat: null, lng: null, source: null }));
}

export async function createPost(input: {
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  postKind: PostKind;
  tripDate: string | null;
  activity: Activity | null;
  taggedUserIds: string[];
  track: { name: string | null; points: TrackPoint[] } | null;
  photos: PreparedPhoto[];
  pin: { title: string; note: string; kind: string; lat: number; lng: number } | null;
  attachRouteIds: string[];
  attachPinIds: string[];
  attachPhotoIds: string[];
}): Promise<string> {
  const tripReport = input.postKind === 'trip_report';
  const track = tripReport ? input.track : null;
  const photos = photosForKind(input.postKind, input.photos);
  const pin = tripReport ? input.pin : null;
  const start = track ? firstPoint(track.points) : null;
  const photoPoint = photos.find((photo) => photo.lat != null && photo.lng != null && isLatLng(photo.lat, photo.lng));
  const lat = start?.lat ?? photoPoint?.lat ?? pin?.lat ?? null;
  const lng = start?.lng ?? photoPoint?.lng ?? pin?.lng ?? null;
  const db = getDb();

  const id = await db.transaction(async (tx) => {
    const pointSql = lat == null || lng == null
      ? sql`null`
      : sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
    const inserted = await tx.execute(sql`
      insert into trip_reports (
        title, body, post_kind, trip_date, activity, author_id, legacy_author_name, tagged_user_ids, published, point
      ) values (
        ${input.title},
        ${input.body},
        ${input.postKind}::post_kind,
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

    if (track && track.points.length >= 2 && input.activity) {
      const wkt = lineWkt(track.points);
      const stats = trackStats(track.points);
      if (wkt) {
        await tx.execute(sql`
          insert into tracks (user_id, trip_report_id, source, name, activity, line, distance_m, elev_gain_m, started_at)
          values (
            ${input.authorId},
            ${id}::uuid,
            'gpx',
            ${track.name || input.title},
            ${input.activity}::activity,
            ST_GeogFromText(${wkt}),
            ${stats.distanceM},
            ${stats.elevGainM},
            ${input.tripDate}::date
          )
        `);
      }
    }

    for (const [index, photo] of photos.entries()) {
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

    if (pin) {
      await tx.execute(sql`
        insert into pins (kind, activity, point, title, note, created_by, visited_on, trip_report_id)
        values (
          ${pin.kind}::pin_kind,
          ${input.activity}::activity,
          ST_SetSRID(ST_MakePoint(${pin.lng}, ${pin.lat}), 4326)::geography,
          ${pin.title},
          ${pin.note || null},
          ${input.authorId},
          ${input.tripDate}::date,
          ${id}::uuid
        )
      `);
    }

    const routeIds = tripReport ? input.attachRouteIds : [];
    const pinIds = tripReport ? input.attachPinIds : [];
    const photoIds = tripReport ? input.attachPhotoIds : [];
    for (const routeId of routeIds) {
      const linked = await tx.execute(sql`
        update tracks
        set trip_report_id = ${id}::uuid
        where id = ${routeId}::uuid and user_id = ${input.authorId} and trip_report_id is null
        returning id::text as id
      `);
      if (!text(asRows(linked)[0]?.id)) throw new Error('One of those routes is already on a trip report.');
    }
    for (const pinId of pinIds) {
      const linked = await tx.execute(sql`
        update pins
        set trip_report_id = ${id}::uuid
        where id = ${pinId}::uuid and created_by = ${input.authorId} and trip_report_id is null
        returning id::text as id
      `);
      if (!text(asRows(linked)[0]?.id)) throw new Error('One of those pins is already on a trip report.');
    }
    for (const photoId of photoIds) {
      const linked = await tx.execute(sql`
        update photos
        set trip_report_id = ${id}::uuid
        where id = ${photoId}::uuid and user_id = ${input.authorId} and trip_report_id is null
        returning id::text as id
      `);
      if (!text(asRows(linked)[0]?.id)) throw new Error('One of those photos is already on a trip report.');
    }

    return id;
  });

  return id;
}

export async function updatePost(input: {
  id: string;
  authorId: string;
  title: string;
  body: string;
  postKind: PostKind;
  tripDate: string | null;
  activity: Activity | null;
  track: { name: string | null; points: TrackPoint[] } | null;
  photos: PreparedPhoto[];
}): Promise<string | null> {
  const track = input.postKind === 'trip_report' ? input.track : null;
  const photos = photosForKind(input.postKind, input.photos);
  const db = getDb();
  const saved = await db.transaction(async (tx) => {
    const updated = await tx.execute(sql`
      update trip_reports
      set title = ${input.title},
        body = ${input.body},
        post_kind = ${input.postKind}::post_kind,
        trip_date = case when ${input.postKind} = 'trip_report' then ${input.tripDate}::date else trip_date end,
        activity = case when ${input.postKind} = 'trip_report' then ${input.activity}::activity else activity end,
        updated_at = now()
      where id = ${input.id}::uuid and author_id = ${input.authorId} and published = true
      returning id::text as id
    `);
    const id = text(asRows(updated)[0]?.id);
    if (!id) return null;

    if (track && track.points.length >= 2 && input.activity && input.tripDate) {
      const wkt = lineWkt(track.points);
      const stats = trackStats(track.points);
      if (wkt) {
        await tx.execute(sql`
          insert into tracks (user_id, trip_report_id, source, name, activity, line, distance_m, elev_gain_m, started_at)
          values (
            ${input.authorId},
            ${id}::uuid,
            'gpx',
            ${track.name || input.title},
            ${input.activity}::activity,
            ST_GeogFromText(${wkt}),
            ${stats.distanceM},
            ${stats.elevGainM},
            ${input.tripDate}::date
          )
        `);
      }
    }

    if (photos.length > 0) {
      const existing = await tx.execute(sql`
        select coalesce(max(sort_order), -1)::int as sort_order
        from photos
        where trip_report_id = ${id}::uuid
      `);
      let sort = num(asRows(existing)[0]?.sort_order) ?? -1;
      for (const photo of photos) {
        if (!isPublicBlobUrl(photo.url)) continue;
        sort += 1;
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
            ${sort},
            ${input.title}
          )
        `);
      }
    }
    return id;
  });

  return saved;
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
  photos: Array<{ id: string; url: string; caption: string | null; postId: string | null; pinId: string | null }>;
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
      select id::text as id, blob_url as url, caption, trip_report_id::text as post_id, pin_id::text as pin_id
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
      return [{ id, url, caption: text(row.caption), postId: text(row.post_id), pinId: text(row.pin_id) }];
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
