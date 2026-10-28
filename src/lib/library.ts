import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { removePhotoFiles } from '@/lib/blobs';
import { cleanRouteTitle, routeTitle } from '@/lib/route-title';
import { routeCutSql, shownLineSql } from '@/lib/route-privacy-sql';
import type { MemberRole } from '@/lib/membership';

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

export type Actor = { id: string; role: MemberRole };

function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

export type AttachChoice = {
  id: string;
  label: string;
  taken: boolean;
  url?: string;
};

export async function listAttachables(userId: string): Promise<{
  routes: AttachChoice[];
  pins: AttachChoice[];
  photos: AttachChoice[];
}> {
  const db = getDb();
  const [routes, pins, photos] = await Promise.all([
    db.execute(sql`
      select t.id::text as id, t.title
      from tracks t
      where t.user_id = ${userId}
      order by t.created_at desc
    `),
    db.execute(sql`
      select id::text as id, title
      from pins
      where created_by = ${userId}
      order by created_at desc
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, coalesce(caption, alt, 'Photo') as label
      from photos
      where user_id = ${userId}
      order by created_at desc
    `),
  ]);
  return {
    routes: asRows(routes).flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [{ id, label: routeTitle(text(row.title)), taken: false }];
    }),
    pins: asRows(pins).flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [{ id, label: text(row.title) ?? 'Pin', taken: false }];
    }),
    photos: asRows(photos).flatMap((row) => {
      const id = text(row.id);
      const url = text(row.url);
      if (!id || !url) return [];
      return [{ id, url, label: text(row.label) ?? 'Photo', taken: false }];
    }),
  };
}

export type LinkedPost = { id: string; title: string };

export type RouteDetail = {
  id: string;
  name: string;
  title: string | null;
  notes: string | null;
  activity: string;
  distanceM: number | null;
  elevGainM: number | null;
  /** Activity date (Eastern), from the GPX start time or the upload time. */
  date: string | null;
  userId: string | null;
  who: string;
  handle: string | null;
  post: LinkedPost | null;
  /** Start and end are hidden from everyone but the owner. */
  hideEnds: boolean;
  lat: number | null;
  lng: number | null;
};

/** `viewerId` matters for a hidden-ends route: only its owner gets the real start. */
export async function loadRoute(id: string, viewerId: string | null): Promise<RouteDetail | null> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title, t.notes, t.activity::text as activity, t.distance_m, t.elev_gain_m, t.user_id,
      t.hide_ends,
      (coalesce(t.started_at, t.created_at) at time zone 'America/New_York')::date::text as route_date,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
      u.handle,
      ST_Y(ST_StartPoint(shown.line)) as lat,
      ST_X(ST_StartPoint(shown.line)) as lng
    from tracks t
    left join users u on u.id = t.user_id
    cross join lateral (${routeCutSql()}) cut
    cross join lateral (select ${shownLineSql(viewerId)} as line) shown
    where t.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const routeId = text(row?.id);
  const activity = text(row?.activity);
  if (!row || !routeId || !activity) return null;
  return {
    id: routeId,
    name: routeTitle(text(row.title)),
    title: cleanRouteTitle(text(row.title)),
    notes: text(row.notes),
    activity,
    distanceM: num(row.distance_m),
    elevGainM: num(row.elev_gain_m),
    date: text(row.route_date),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: null,
    hideEnds: row.hide_ends === true,
    lat: num(row.lat),
    lng: num(row.lng),
  };
}

export type PhotoDetail = {
  id: string;
  url: string;
  caption: string | null;
  userId: string | null;
  who: string;
  handle: string | null;
  post: LinkedPost | null;
  pinId: string | null;
  pinTitle: string | null;
  /** Eastern date the photo was taken, when the camera recorded it. */
  takenOn: string | null;
  /** Eastern date it was added. */
  addedOn: string | null;
  trips: Array<{ id: string; title: string }>;
  /** The uploader's own route that passes within 200 m, if any. */
  route: { id: string; title: string } | null;
  lat: number | null;
  lng: number | null;
};

const NEAR_ROUTE_METERS = 200;

/** `viewerId` keeps a route's hidden ends out of the nearby-route match. */
export async function loadPhoto(id: string, viewerId: string | null): Promise<PhotoDetail | null> {
  const db = getDb();
  const [result, tripResult, routeResult] = await Promise.all([
    db.execute(sql`
      select p.id::text as id, p.blob_url as url, p.caption, p.user_id, p.pin_id::text as pin_id,
        pin.title as pin_title,
        (p.taken_at at time zone 'America/New_York')::date::text as taken_on,
        (p.created_at at time zone 'America/New_York')::date::text as added_on,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        u.handle,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
      from photos p
      left join users u on u.id = p.user_id
      left join pins pin on pin.id = p.pin_id
      where p.id = ${id}::uuid
    `),
    db.execute(sql`
      select t.id::text as id, t.title
      from trip_photos tp
      join trips t on t.id = tp.trip_id
      where tp.photo_id = ${id}::uuid
      order by t.start_at desc nulls last
    `),
    db.execute(sql`
      select t.id::text as id, t.title
      from photos p
      join tracks t on t.user_id = p.user_id
      cross join lateral (${routeCutSql()}) cut
      cross join lateral (select ${shownLineSql(viewerId)} as line) shown
      where p.id = ${id}::uuid and p.point is not null
        and ST_DWithin(shown.line::geography, p.point, ${NEAR_ROUTE_METERS})
      order by ST_Distance(shown.line::geography, p.point)
      limit 1
    `),
  ]);
  const row = asRows(result)[0];
  const photoId = text(row?.id);
  const url = text(row?.url);
  if (!row || !photoId || !url) return null;
  const routeRow = asRows(routeResult)[0];
  const routeId = text(routeRow?.id);
  return {
    id: photoId,
    url,
    caption: text(row.caption),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: null,
    pinId: text(row.pin_id),
    pinTitle: text(row.pin_title),
    takenOn: text(row.taken_on),
    addedOn: text(row.added_on),
    trips: asRows(tripResult).flatMap((trip) => {
      const tripId = text(trip.id);
      return tripId ? [{ id: tripId, title: text(trip.title) ?? 'Trip' }] : [];
    }),
    route: routeId ? { id: routeId, title: routeTitle(text(routeRow?.title)) } : null,
    lat: num(row.lat),
    lng: num(row.lng),
  };
}

export async function updateRouteTitle(
  id: string,
  title: string | null,
  notes: string | null,
  actor: Actor,
  hideEnds: boolean,
): Promise<boolean> {
  const result = await getDb().execute(sql`
    update tracks
    set title = ${title}, notes = ${notes}, hide_ends = ${hideEnds}
    where id = ${id}::uuid and user_id = ${actor.id}
    returning id::text as id
  `);
  return Boolean(text(asRows(result)[0]?.id));
}

export async function deleteRoute(id: string, actor: Actor): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from tracks
    where id = ${id}::uuid and (${isAdmin(actor)} or user_id = ${actor.id})
    returning id::text as id
  `);
  return Boolean(text(asRows(result)[0]?.id));
}

export async function deletePhoto(id: string, actor: Actor): Promise<boolean> {
  const db = getDb();
  const found = await db.execute(sql`
    select blob_url, thumb_url from photos
    where id = ${id}::uuid and (${isAdmin(actor)} or user_id = ${actor.id})
  `);
  const row = asRows(found)[0];
  if (!row) return false;
  await db.execute(sql`delete from photos where id = ${id}::uuid`);
  await removePhotoFiles([text(row.blob_url), text(row.thumb_url)]);
  return true;
}

