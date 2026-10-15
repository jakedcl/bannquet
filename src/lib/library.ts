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
      select t.id::text as id, t.name, t.trip_report_id::text as post_id
      from tracks t
      where t.user_id = ${userId}
      order by t.created_at desc
    `),
    db.execute(sql`
      select id::text as id, title, trip_report_id::text as post_id
      from pins
      where created_by = ${userId}
      order by created_at desc
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, coalesce(caption, alt, 'Photo') as label, trip_report_id::text as post_id
      from photos
      where user_id = ${userId}
      order by created_at desc
    `),
  ]);
  return {
    routes: asRows(routes).flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [{ id, label: text(row.name) ?? 'Route', taken: Boolean(text(row.post_id)) }];
    }),
    pins: asRows(pins).flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [{ id, label: text(row.title) ?? 'Pin', taken: Boolean(text(row.post_id)) }];
    }),
    photos: asRows(photos).flatMap((row) => {
      const id = text(row.id);
      const url = text(row.url);
      if (!id || !url) return [];
      return [{ id, url, label: text(row.label) ?? 'Photo', taken: Boolean(text(row.post_id)) }];
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
      tr.id::text as post_id, tr.title as post_title,
      ST_Y(ST_StartPoint(t.line::geometry)) as lat,
      ST_X(ST_StartPoint(t.line::geometry)) as lng
    from tracks t
    left join users u on u.id = t.user_id
    left join trip_reports tr on tr.id = t.trip_report_id
    where t.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const routeId = text(row?.id);
  const activity = text(row?.activity);
  if (!row || !routeId || !activity) return null;
  const postId = text(row.post_id);
  return {
    id: routeId,
    name: text(row.name) ?? 'Route',
    activity,
    distanceM: num(row.distance_m),
    elevGainM: num(row.elev_gain_m),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: postId ? { id: postId, title: text(row.post_title) ?? 'Trip' } : null,
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
      tr.id::text as post_id, tr.title as post_title,
      ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng
    from photos p
    left join users u on u.id = p.user_id
    left join trip_reports tr on tr.id = p.trip_report_id
    where p.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const photoId = text(row?.id);
  const url = text(row?.url);
  if (!row || !photoId || !url) return null;
  const postId = text(row.post_id);
  return {
    id: photoId,
    url,
    caption: text(row.caption),
    userId: text(row.user_id),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: postId ? { id: postId, title: text(row.post_title) ?? 'Trip' } : null,
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

export async function listReportAttachments(reportId: string): Promise<{
  routes: ReportAttachment[];
  pins: ReportAttachment[];
  photos: ReportAttachment[];
}> {
  const db = getDb();
  const [routes, pins, photos] = await Promise.all([
    db.execute(sql`
      select id::text as id, name from tracks where trip_report_id = ${reportId}::uuid order by created_at asc
    `),
    db.execute(sql`
      select id::text as id, title from pins where trip_report_id = ${reportId}::uuid order by created_at asc
    `),
    db.execute(sql`
      select id::text as id, coalesce(caption, alt, 'Photo') as title
      from photos where trip_report_id = ${reportId}::uuid order by sort_order asc, created_at asc
    `),
  ]);
  const mapRows = (rows: Record<string, unknown>[], hrefBase: string): ReportAttachment[] => rows.flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{ id, title: text(row.title) ?? text(row.name) ?? 'Item', href: `${hrefBase}/${id}` }];
  });
  return {
    routes: asRows(routes).flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [{ id, title: text(row.name) ?? 'Route', href: `/routes/${id}` }];
    }),
    pins: mapRows(asRows(pins), '/pins'),
    photos: mapRows(asRows(photos), '/photos'),
  };
}

async function ownReport(reportId: string, actor: Actor): Promise<boolean> {
  const result = await getDb().execute(sql`
    select id::text as id from trip_reports
    where id = ${reportId}::uuid and (${isAdmin(actor)} or author_id = ${actor.id})
  `);
  return Boolean(text(asRows(result)[0]?.id));
}

export async function attachEntity(input: {
  actor: Actor;
  reportId: string;
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
}): Promise<'ok' | 'missing' | 'forbidden' | 'taken'> {
  if (!(await ownReport(input.reportId, input.actor))) return 'forbidden';
  const table = input.kind === 'route' ? 'tracks' : input.kind === 'pin' ? 'pins' : 'photos';
  const ownerColumn = input.kind === 'pin' ? 'created_by' : 'user_id';
  const result = await getDb().execute(sql`
    update ${sql.raw(table)}
    set trip_report_id = ${input.reportId}::uuid
    where id = ${input.entityId}::uuid
      and (${isAdmin(input.actor)} or ${sql.raw(ownerColumn)} = ${input.actor.id})
      and (trip_report_id is null or trip_report_id = ${input.reportId}::uuid)
    returning id::text as id, trip_report_id::text as post_id
  `);
  const row = asRows(result)[0];
  if (!text(row?.id)) {
    const exists = await getDb().execute(sql`
      select trip_report_id::text as post_id from ${sql.raw(table)} where id = ${input.entityId}::uuid
    `);
    const current = text(asRows(exists)[0]?.post_id);
    if (!asRows(exists).length) return 'missing';
    if (current && current !== input.reportId) return 'taken';
    return 'forbidden';
  }
  return 'ok';
}

export async function detachEntity(input: {
  actor: Actor;
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
}): Promise<boolean> {
  const table = input.kind === 'route' ? 'tracks' : input.kind === 'pin' ? 'pins' : 'photos';
  const ownerColumn = input.kind === 'pin' ? 'created_by' : 'user_id';
  const result = await getDb().execute(sql`
    update ${sql.raw(table)}
    set trip_report_id = null
    where id = ${input.entityId}::uuid
      and (${isAdmin(input.actor)} or ${sql.raw(ownerColumn)} = ${input.actor.id})
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
    select blob_url from photos
    where id = ${id}::uuid and (${isAdmin(actor)} or user_id = ${actor.id})
  `);
  const url = text(asRows(found)[0]?.blob_url);
  if (!asRows(found).length) return false;
  await db.execute(sql`delete from photos where id = ${id}::uuid`);
  if (url) await removeBlobs([url]);
  return true;
}

export async function deleteReport(id: string, actor: Actor, mode: 'report' | 'all'): Promise<boolean> {
  const db = getDb();
  const owned = await db.execute(sql`
    select id::text as id from trip_reports
    where id = ${id}::uuid and (${isAdmin(actor)} or author_id = ${actor.id})
  `);
  if (!text(asRows(owned)[0]?.id)) return false;
  if (mode === 'report') {
    await db.execute(sql`delete from trip_reports where id = ${id}::uuid`);
    return true;
  }
  const blobs = await db.execute(sql`
    select blob_url from photos
    where trip_report_id = ${id}::uuid
       or pin_id in (select id from pins where trip_report_id = ${id}::uuid)
  `);
  const urls = asRows(blobs).map((row) => text(row.blob_url)).filter((url): url is string => Boolean(url));
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      delete from photos
      where trip_report_id = ${id}::uuid
         or pin_id in (select id from pins where trip_report_id = ${id}::uuid)
    `);
    await tx.execute(sql`delete from tracks where trip_report_id = ${id}::uuid`);
    await tx.execute(sql`delete from pins where trip_report_id = ${id}::uuid`);
    await tx.execute(sql`delete from trip_reports where id = ${id}::uuid`);
  });
  await removeBlobs(urls);
  return true;
}
