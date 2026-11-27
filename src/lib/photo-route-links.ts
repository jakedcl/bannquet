import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { bumpMapCache } from '@/lib/posts';
import { ROUTE_PHOTO_NEAR_METERS } from '@/lib/route-photo-link';
import { routeCutSql, shownLineSql } from '@/lib/route-privacy-sql';
import { routeTitle } from '@/lib/route-title';
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

export async function autoLinkAllPhotoRoutes(): Promise<number> {
  const result = await getDb().execute(sql`
    insert into photo_routes (photo_id, track_id, source)
    select p.id, t.id, 'auto'::photo_route_source
    from photos p
    join tracks t on t.user_id = p.user_id
    where p.taken_at is not null
      and p.point is not null
      and t.started_at is not null
      and t.ended_at is not null
      and p.taken_at >= t.started_at - interval '5 seconds'
      and p.taken_at <= t.ended_at + interval '15 seconds'
      and ST_DWithin(t.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      and not exists (
        select 1 from photo_route_unlinks u
        where u.photo_id = p.id and u.track_id = t.id
      )
    on conflict do nothing
    returning photo_id
  `);
  const n = asRows(result).length;
  if (n > 0) bumpMapCache();
  return n;
}

export async function autoLinkPhoto(photoId: string): Promise<void> {
  const result = await getDb().execute(sql`
    insert into photo_routes (photo_id, track_id, source)
    select p.id, t.id, 'auto'::photo_route_source
    from photos p
    join tracks t on t.user_id = p.user_id
    where p.id = ${photoId}::uuid
      and p.taken_at is not null
      and p.point is not null
      and t.started_at is not null
      and t.ended_at is not null
      and p.taken_at >= t.started_at - interval '5 seconds'
      and p.taken_at <= t.ended_at + interval '15 seconds'
      and ST_DWithin(t.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      and not exists (
        select 1 from photo_route_unlinks u
        where u.photo_id = p.id and u.track_id = t.id
      )
    on conflict do nothing
    returning photo_id
  `);
  if (asRows(result).length > 0) bumpMapCache();
}

export async function autoLinkTrack(trackId: string): Promise<void> {
  const result = await getDb().execute(sql`
    insert into photo_routes (photo_id, track_id, source)
    select p.id, t.id, 'auto'::photo_route_source
    from tracks t
    join photos p on p.user_id = t.user_id
    where t.id = ${trackId}::uuid
      and p.taken_at is not null
      and p.point is not null
      and t.started_at is not null
      and t.ended_at is not null
      and p.taken_at >= t.started_at - interval '5 seconds'
      and p.taken_at <= t.ended_at + interval '15 seconds'
      and ST_DWithin(t.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      and not exists (
        select 1 from photo_route_unlinks u
        where u.photo_id = p.id and u.track_id = t.id
      )
    on conflict do nothing
    returning photo_id
  `);
  if (asRows(result).length > 0) bumpMapCache();
}

export type LinkedRoutePhoto = {
  id: string;
  url: string;
  thumbUrl: string | null;
  caption: string | null;
};

/** Linked photos on a route page, respecting hide-ends for viewers who are not the owner. */
export async function loadLinkedPhotosForRoute(
  trackId: string,
  viewerId: string | null,
): Promise<LinkedRoutePhoto[]> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.blob_url as url, p.thumb_url, coalesce(p.caption, p.alt) as caption
    from photo_routes pr
    join photos p on p.id = pr.photo_id
    join tracks t on t.id = pr.track_id
    cross join lateral (${routeCutSql()}) cut
    cross join lateral (select ${shownLineSql(viewerId)} as line) shown
    where pr.track_id = ${trackId}::uuid
      and p.point is not null
      and (
        t.user_id is not distinct from ${viewerId ?? ''}::text
        or cut.line is null
        or ST_DWithin(shown.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      )
    order by p.taken_at nulls last, p.sort_order, p.created_at
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    const url = text(row.url);
    if (!id || !url) return [];
    return [{
      id,
      url,
      thumbUrl: text(row.thumb_url),
      caption: text(row.caption),
    }];
  });
}

export type SavedPhotoRoute = { id: string; title: string };

export async function loadSavedPhotoRoute(
  photoId: string,
  viewerId: string | null,
): Promise<SavedPhotoRoute | null> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title
    from photo_routes pr
    join tracks t on t.id = pr.track_id
    join photos p on p.id = pr.photo_id
    cross join lateral (${routeCutSql()}) cut
    cross join lateral (select ${shownLineSql(viewerId)} as line) shown
    where pr.photo_id = ${photoId}::uuid
      and (
        t.user_id is not distinct from ${viewerId ?? ''}::text
        or cut.line is null
        or p.point is null
        or ST_DWithin(shown.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      )
    order by pr.created_at desc
    limit 1
  `);
  const row = asRows(result)[0];
  const id = text(row?.id);
  if (!id) return null;
  return { id, title: routeTitle(text(row?.title)) };
}

export type RouteLinkPickerPhoto = {
  id: string;
  label: string;
  url: string;
  thumbUrl: string | null;
  linked: boolean;
};

export async function loadOwnerPhotosForRouteLink(
  trackId: string,
  ownerId: string,
): Promise<RouteLinkPickerPhoto[]> {
  const result = await getDb().execute(sql`
    select
      p.id::text as id,
      coalesce(p.caption, p.alt, 'Photo') as label,
      p.blob_url as url,
      p.thumb_url,
      exists(select 1 from photo_routes pr where pr.photo_id = p.id and pr.track_id = ${trackId}::uuid) as linked
    from photos p
    where p.user_id = ${ownerId}
    order by p.created_at desc
    limit 200
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    const url = text(row.url);
    if (!id || !url) return [];
    return [{
      id,
      label: text(row.label) ?? 'Photo',
      url,
      thumbUrl: text(row.thumb_url),
      linked: row.linked === true,
    }];
  });
}

type Actor = { id: string; role: MemberRole };

function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

export async function addManualPhotoRouteLink(
  trackId: string,
  photoId: string,
  actor: Actor,
): Promise<boolean> {
  const db = getDb();
  const ok = await db.transaction(async (tx) => {
    const allowed = await tx.execute(sql`
      select 1
      from tracks t
      join photos p on p.id = ${photoId}::uuid
      where t.id = ${trackId}::uuid
        and (${isAdmin(actor)} or t.user_id = ${actor.id})
        and (${isAdmin(actor)} or p.user_id = ${actor.id})
      limit 1
    `);
    if (asRows(allowed).length === 0) return false;
    await tx.execute(sql`
      delete from photo_route_unlinks
      where photo_id = ${photoId}::uuid and track_id = ${trackId}::uuid
    `);
    await tx.execute(sql`
      insert into photo_routes (photo_id, track_id, source)
      values (${photoId}::uuid, ${trackId}::uuid, 'manual'::photo_route_source)
      on conflict (photo_id, track_id) do update set source = 'manual'::photo_route_source
    `);
    return true;
  });
  if (ok) bumpMapCache();
  return ok;
}

export async function removePhotoRouteLink(
  trackId: string,
  photoId: string,
  actor: Actor,
): Promise<boolean> {
  const db = getDb();
  const ok = await db.transaction(async (tx) => {
    const allowed = await tx.execute(sql`
      select 1
      from tracks t
      where t.id = ${trackId}::uuid
        and (${isAdmin(actor)} or t.user_id = ${actor.id})
      limit 1
    `);
    if (asRows(allowed).length === 0) return false;
    await tx.execute(sql`
      delete from photo_routes
      where track_id = ${trackId}::uuid and photo_id = ${photoId}::uuid
    `);
    await tx.execute(sql`
      insert into photo_route_unlinks (photo_id, track_id)
      values (${photoId}::uuid, ${trackId}::uuid)
      on conflict do nothing
    `);
    return true;
  });
  if (ok) bumpMapCache();
  return ok;
}

/** Count rows that would be inserted by auto-link (no writes). */
export async function countAutoLinkCandidates(): Promise<number> {
  const result = await getDb().execute(sql`
    select count(*)::int as n
    from photos p
    join tracks t on t.user_id = p.user_id
    where p.taken_at is not null
      and p.point is not null
      and t.started_at is not null
      and t.ended_at is not null
      and p.taken_at >= t.started_at - interval '5 seconds'
      and p.taken_at <= t.ended_at + interval '15 seconds'
      and ST_DWithin(t.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      and not exists (
        select 1 from photo_route_unlinks u
        where u.photo_id = p.id and u.track_id = t.id
      )
      and not exists (
        select 1 from photo_routes pr
        where pr.photo_id = p.id and pr.track_id = t.id
      )
  `);
  return Number(asRows(result)[0]?.n ?? 0);
}

export async function loadPhotoRouteLinksForMap(
  viewerId: string | null,
): Promise<Map<string, { trackId: string; routeTitle: string }>> {
  const result = await getDb().execute(sql`
    select
      p.id::text as photo_id,
      t.id::text as track_id,
      t.title
    from photo_routes pr
    join photos p on p.id = pr.photo_id
    join tracks t on t.id = pr.track_id
    cross join lateral (${routeCutSql()}) cut
    cross join lateral (select ${shownLineSql(viewerId)} as line) shown
    where p.point is not null
      and (
        t.user_id is not distinct from ${viewerId ?? ''}::text
        or cut.line is null
        or ST_DWithin(shown.line::geography, p.point, ${ROUTE_PHOTO_NEAR_METERS})
      )
  `);
  const out = new Map<string, { trackId: string; routeTitle: string }>();
  for (const row of asRows(result)) {
    const photoId = text(row.photo_id);
    const trackId = text(row.track_id);
    if (!photoId || !trackId) continue;
    out.set(photoId, { trackId, routeTitle: routeTitle(text(row.title)) });
  }
  return out;
}