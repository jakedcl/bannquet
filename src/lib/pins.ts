import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { removeBlobs } from '@/lib/blobs';
import { sortLoggedActivities, type Activity } from '@/lib/activities';
import { isLatLng } from '@/lib/photos';
import { isPinKind, type PinKind } from '@/lib/pin-kinds';
import type { PreparedPhoto } from '@/lib/posts';

export type { PinKind } from '@/lib/pin-kinds';

export type PinSummary = {
  id: string;
  title: string;
  activity: string | null;
  kind: string;
  visitedOn: string | null;
};

export type PinPhoto = {
  id: string;
  url: string;
  alt: string | null;
};

export type PinDetail = {
  id: string;
  title: string;
  note: string | null;
  activity: string | null;
  kind: PinKind;
  visitedOn: string | null;
  lat: number;
  lng: number;
  createdBy: string | null;
  who: string;
  handle: string | null;
  post: { id: string; title: string } | null;
  photos: PinPhoto[];
};

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

/** Activity types this member has logged on a post, route, or pin, busiest first. */
export async function loadLoggedActivities(userId: string): Promise<Activity[]> {
  const result = await getDb().execute(sql`
    select activity, count(*)::int as n, max(happened)::text as latest
    from (
      select activity::text as activity, coalesce(trip_date, created_at::date) as happened
      from trip_reports
      where published = true and author_id = ${userId} and activity is not null
      union all
      select activity::text, coalesce(started_at::date, created_at::date)
      from tracks
      where user_id = ${userId} and activity is not null
      union all
      select activity::text, coalesce(visited_on, created_at::date)
      from pins
      where created_by = ${userId} and activity is not null
    ) uploads
    group by activity
  `);
  return sortLoggedActivities(asRows(result).flatMap((row) => {
    const activity = text(row.activity);
    const count = num(row.n);
    if (!activity || count == null) return [];
    return [{ activity: activity as Activity, count, latest: text(row.latest) ?? '' }];
  })).map((row) => row.activity);
}

export async function loadProfilePins(userId: string): Promise<PinSummary[]> {
  const result = await getDb().execute(sql`
    select id::text as id, title, activity::text as activity, kind::text as kind, visited_on::text as visited_on
    from pins
    where created_by = ${userId}
    order by visited_on desc nulls last, created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{
      id,
      title: text(row.title) ?? 'Pin',
      activity: text(row.activity),
      kind: text(row.kind) ?? 'other',
      visitedOn: text(row.visited_on),
    }];
  });
}

export async function loadPin(id: string): Promise<PinDetail | null> {
  const db = getDb();
  const [pinResult, photoResult] = await Promise.all([
    db.execute(sql`
      select p.id::text as id, p.title, p.note, p.activity::text as activity, p.kind::text as kind,
        p.visited_on::text as visited_on, p.created_by,
        ST_Y(p.point::geometry) as lat, ST_X(p.point::geometry) as lng,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as who,
        u.handle,
        tr.id::text as post_id, tr.title as post_title
      from pins p
      left join users u on u.id = p.created_by
      left join trip_reports tr on tr.id = p.trip_report_id
      where p.id = ${id}::uuid
    `),
    db.execute(sql`
      select id::text as id, blob_url as url, alt
      from photos
      where pin_id = ${id}::uuid
      order by sort_order asc, created_at asc
    `),
  ]);
  const row = asRows(pinResult)[0];
  const lat = num(row?.lat);
  const lng = num(row?.lng);
  const pinId = text(row?.id);
  const kind = text(row?.kind);
  if (!row || !pinId || lat == null || lng == null || !kind || !isPinKind(kind)) return null;
  return {
    id: pinId,
    title: text(row.title) ?? 'Pin',
    note: text(row.note),
    activity: text(row.activity),
    kind,
    visitedOn: text(row.visited_on),
    lat,
    lng,
    createdBy: text(row.created_by),
    who: text(row.who) ?? 'Friend',
    handle: text(row.handle),
    post: text(row.post_id) ? { id: text(row.post_id) as string, title: text(row.post_title) ?? 'Trip' } : null,
    photos: asRows(photoResult).flatMap((photo) => {
      const photoId = text(photo.id);
      const url = text(photo.url);
      if (!photoId || !url) return [];
      return [{ id: photoId, url, alt: text(photo.alt) }];
    }),
  };
}

async function insertPinPhotos(
  tx: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  input: { pinId: string; userId: string; title: string; photos: PreparedPhoto[]; startOrder: number },
): Promise<void> {
  for (const [offset, photo] of input.photos.entries()) {
    const located = photo.lat != null && photo.lng != null && isLatLng(photo.lat, photo.lng);
    const pointSql = located
      ? sql`ST_SetSRID(ST_MakePoint(${photo.lng}, ${photo.lat}), 4326)::geography`
      : sql`null`;
    await tx.execute(sql`
      insert into photos (pin_id, user_id, blob_url, width, height, point, point_source, sort_order, alt, caption)
      values (
        ${input.pinId}::uuid,
        ${input.userId},
        ${photo.url},
        ${photo.width || null},
        ${photo.height || null},
        ${pointSql},
        ${located ? photo.source : null},
        ${input.startOrder + offset},
        ${input.title},
        ${input.title}
      )
    `);
  }
}

export async function createPin(input: {
  userId: string;
  title: string;
  note: string;
  activity: Activity;
  kind: PinKind;
  visitedOn: string;
  lat: number;
  lng: number;
  photos: PreparedPhoto[];
}): Promise<string> {
  const id = await getDb().transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      insert into pins (kind, activity, point, title, note, created_by, visited_on)
      values (
        ${input.kind}::pin_kind,
        ${input.activity}::activity,
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
        ${input.title},
        ${input.note || null},
        ${input.userId},
        ${input.visitedOn}::date
      )
      returning id::text as id
    `);
    const pinId = text(asRows(inserted)[0]?.id);
    if (!pinId) throw new Error('Could not save that pin.');
    await insertPinPhotos(tx, { pinId, userId: input.userId, title: input.title, photos: input.photos, startOrder: 0 });
    return pinId;
  });
  return id;
}

export async function updatePin(input: {
  id: string;
  userId: string;
  title: string;
  note: string;
  activity: Activity;
  kind: PinKind;
  visitedOn: string;
  lat: number;
  lng: number;
  photos: PreparedPhoto[];
  removePhotoIds: string[];
}): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const updated = await tx.execute(sql`
      update pins
      set title = ${input.title},
          note = ${input.note || null},
          activity = ${input.activity}::activity,
          kind = ${input.kind}::pin_kind,
          visited_on = ${input.visitedOn}::date,
          point = ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography
      where id = ${input.id}::uuid and created_by = ${input.userId}
      returning id::text as id
    `);
    if (!text(asRows(updated)[0]?.id)) return false;
    const removedUrls: string[] = [];
    for (const photoId of input.removePhotoIds) {
      const found = await tx.execute(sql`
        delete from photos
        where id = ${photoId}::uuid and pin_id = ${input.id}::uuid and user_id = ${input.userId}
        returning blob_url
      `);
      const url = text(asRows(found)[0]?.blob_url);
      if (url) removedUrls.push(url);
    }
    if (removedUrls.length > 0) await removeBlobs(removedUrls);
    const count = await tx.execute(sql`
      select count(*)::int as n from photos where pin_id = ${input.id}::uuid
    `);
    const startOrder = num(asRows(count)[0]?.n) ?? 0;
    await insertPinPhotos(tx, {
      pinId: input.id,
      userId: input.userId,
      title: input.title,
      photos: input.photos,
      startOrder,
    });
    return true;
  });
}

export async function deletePin(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const db = getDb();
  const photos = await db.execute(sql`
    select ph.blob_url
    from photos ph
    join pins p on p.id = ph.pin_id
    where p.id = ${id}::uuid and (${actor.admin} or p.created_by = ${actor.id})
  `);
  const urls = asRows(photos).map((row) => text(row.blob_url)).filter((url): url is string => Boolean(url));
  const removed = await db.transaction(async (tx) => {
    const owned = await tx.execute(sql`
      select id::text as id from pins
      where id = ${id}::uuid and (${actor.admin} or created_by = ${actor.id})
    `);
    if (!text(asRows(owned)[0]?.id)) return false;
    await tx.execute(sql`delete from photos where pin_id = ${id}::uuid`);
    await tx.execute(sql`delete from pins where id = ${id}::uuid`);
    return true;
  });
  if (removed) await removeBlobs(urls);
  return removed;
}
