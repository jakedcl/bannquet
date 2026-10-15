import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { removeBlobs } from '@/lib/blobs';
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
      select t.id::text as id, t.name
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
      return [{ id, label: text(row.name) ?? 'Route', taken: false }];
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
  activity: string;
  distanceM: number | null;
  elevGainM: number | null;
  userId: string | null;
  who: string;
  handle: string | null;
  post: LinkedPost | null;
  lat: number | null;
  lng: number | null;
};

export async function loadRoute(id: string): Promise<RouteDetail | null> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.name, t.activity::text as activity, t.distance_m, t.elev_gain_m, t.user_id,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
      u.handle,
      ST_Y(ST_StartPoint(t.line::geometry)) as lat,
      ST_X(ST_StartPoint(t.line::geometry)) as lng
    from tracks t
    left join users u on u.id = t.user_id
    where t.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const routeId = text(row?.id);
  const activity = text(row?.activity);
  if (!row || !routeId || !activity) return null;
  return {
    id: routeId,
    name: text(row.name) ?? 'Route',
    activity,
    distanceM: num(row.distance_m),
    elevGainM: num(row.elev_gain_m),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: null,
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
  lat: number | null;
  lng: number | null;
};

export async function loadPhoto(id: string): Promise<PhotoDetail | null> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.blob_url as url, p.caption, p.user_id, p.pin_id::text as pin_id,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
      u.handle,
      ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
    from photos p
    left join users u on u.id = p.user_id
    where p.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const photoId = text(row?.id);
  const url = text(row?.url);
  if (!row || !photoId || !url) return null;
  return {
    id: photoId,
    url,
    caption: text(row.caption),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: null,
    pinId: text(row.pin_id),
    lat: num(row.lat),
    lng: num(row.lng),
  };
}

export type ReportAttachment = {
  id: string;
  title: string;
  href: string;
};

export async function listReportAttachments(_reportId: string): Promise<{
  routes: ReportAttachment[];
  pins: ReportAttachment[];
  photos: ReportAttachment[];
}> {
  return { routes: [], pins: [], photos: [] };
}

export async function attachEntity(_input: {
  actor: Actor;
  reportId: string;
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
}): Promise<'ok' | 'missing' | 'forbidden' | 'taken'> {
  return 'missing';
}

export async function detachEntity(_input: {
  actor: Actor;
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
}): Promise<boolean> {
  return false;
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
    select blob_url from photos
    where id = ${id}::uuid and (${isAdmin(actor)} or user_id = ${actor.id})
  `);
  const url = text(asRows(found)[0]?.blob_url);
  if (!asRows(found).length) return false;
  await db.execute(sql`delete from photos where id = ${id}::uuid`);
  if (url) await removeBlobs([url]);
  return true;
}

export async function deleteReport(_id: string, _actor: Actor, _mode: 'report' | 'all'): Promise<boolean> {
  return false;
}
