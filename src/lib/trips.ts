import { sql } from 'drizzle-orm';
import { routeTitle } from '@/lib/route-title';
import { getDb } from '@/db';

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

export type TripSummary = {
  id: string;
  title: string;
  tripDate: string | null;
  activity: string | null;
  trailheadName: string | null;
  going: number;
};

export type TripPerson = {
  id: string;
  name: string;
  handle: string | null;
};

export type TripAttachment = {
  kind: 'pin' | 'route' | 'photo';
  id: string;
  label: string;
  href: string;
  thumb: string | null;
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
};

export type TripDetail = TripSummary & {
  lat: number | null;
  lng: number | null;
  createdBy: string | null;
  notes: string;
  upcoming: boolean;
  people: TripPerson[];
  attachments: TripAttachment[];
  posts: Array<{ id: string; title: string; tripDate: string | null }>;
};

export async function listTrips(): Promise<TripSummary[]> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title,
      coalesce(t.trip_date, t.start_at::date)::text as trip_date,
      t.activity::text as activity, t.trailhead_name,
      (select count(*)::int from trip_members tm where tm.trip_id = t.id and tm.rsvp = 'going') as going
    from trips t
    order by
      case when coalesce(t.trip_date, t.start_at::date) >= current_date then 0 else 1 end,
      case when coalesce(t.trip_date, t.start_at::date) >= current_date then coalesce(t.trip_date, t.start_at::date) end asc nulls last,
      case when coalesce(t.trip_date, t.start_at::date) < current_date then coalesce(t.trip_date, t.start_at::date) end desc nulls last,
      t.created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{
      id,
      title: text(row.title) ?? 'Trip',
      tripDate: text(row.trip_date),
      activity: text(row.activity),
      trailheadName: text(row.trailhead_name),
      going: num(row.going) ?? 0,
    }];
  });
}

export async function getTrip(id: string): Promise<TripDetail | null> {
  const db = getDb();
  const [tripResult, peopleResult, attachmentResult] = await Promise.all([
    db.execute(sql`
      select t.id::text as id, t.title,
        coalesce(t.trip_date, t.start_at::date)::text as trip_date,
        t.activity::text as activity, t.trailhead_name, t.created_by, t.notes,
        (coalesce(t.trip_date, t.start_at::date) is null or coalesce(t.trip_date, t.start_at::date) >= current_date) as upcoming,
        ST_Y(t.trailhead_point::geometry) as lat, ST_X(t.trailhead_point::geometry) as lng
      from trips t
      where t.id = ${id}::uuid
    `),
    db.execute(sql`
      select u.id, coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name, u.handle
      from trip_members tm
      join users u on u.id = tm.user_id
      where tm.trip_id = ${id}::uuid and tm.rsvp = 'going'
      order by tm.role desc, name
    `),
    db.execute(sql`
      select 'pin' as kind, p.id::text as id, p.title as label, null::text as thumb
      from trip_pins tp
      join pins p on p.id = tp.pin_id
      where tp.trip_id = ${id}::uuid
      union all
      select 'route', t.id::text, t.title, null::text
      from trip_routes tr
      join tracks t on t.id = tr.track_id
      where tr.trip_id = ${id}::uuid
      union all
      select 'photo', ph.id::text, coalesce(ph.caption, ph.alt, 'Photo'), ph.blob_url, ph.thumb_url
      from trip_photos tp
      join photos ph on ph.id = tp.photo_id
      where tp.trip_id = ${id}::uuid
    `),
  ]);
  const row = asRows(tripResult)[0];
  const tripId = text(row?.id);
  if (!row || !tripId) return null;
  return {
    id: tripId,
    title: text(row.title) ?? 'Trip',
    tripDate: text(row.trip_date),
    activity: text(row.activity),
    trailheadName: text(row.trailhead_name),
    going: asRows(peopleResult).length,
    lat: num(row.lat),
    lng: num(row.lng),
    createdBy: text(row.created_by),
    notes: text(row.notes) ?? '',
    upcoming: row.upcoming === true || row.upcoming === 't' || row.upcoming === 'true',
    people: asRows(peopleResult).flatMap((person) => {
      const personId = text(person.id);
      if (!personId) return [];
      return [{ id: personId, name: text(person.name) ?? 'Friend', handle: text(person.handle) }];
    }),
    attachments: asRows(attachmentResult).flatMap((item) => {
      const itemId = text(item.id);
      const kind = text(item.kind);
      if (!itemId || (kind !== 'pin' && kind !== 'route' && kind !== 'photo')) return [];
      const href = kind === 'pin' ? `/pins/${itemId}` : kind === 'route' ? `/routes/${itemId}` : `/photos/${itemId}`;
      const raw = text(item.label);
      const label = kind === 'route' ? routeTitle(raw) : (raw ?? 'Item');
      const photoUrl = kind === 'photo' ? text(item.thumb) : null;
      const photoThumbUrl = kind === 'photo' ? text(item.thumb_url) : null;
      return [{
        kind,
        id: itemId,
        label,
        href,
        thumb: photoThumbUrl ?? photoUrl,
        photoUrl,
        photoThumbUrl,
      }];
    }),
    posts: [],
  };
}

function tripSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'trip';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

const ATTACH_TABLE = {
  pin: { table: 'trip_pins', column: 'pin_id', source: 'pins' },
  route: { table: 'trip_routes', column: 'track_id', source: 'tracks' },
  photo: { table: 'trip_photos', column: 'photo_id', source: 'photos' },
} as const;

export async function createTrip(input: {
  userId: string;
  title: string;
  tripDate: string;
  notes: string;
  attachments?: Array<{ kind: 'pin' | 'route' | 'photo'; id: string }>;
}): Promise<string> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      insert into trips (title, slug, activity, start_at, trip_date, notes, status, created_by)
      values (
        ${input.title},
        ${tripSlug(input.title)},
        'hike'::activity,
        ${input.tripDate}::date,
        ${input.tripDate}::date,
        ${input.notes || null},
        'planned',
        ${input.userId}
      )
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (!id) throw new Error('Could not save that trip.');
    await tx.execute(sql`
      insert into trip_members (trip_id, user_id, rsvp, role)
      values (${id}::uuid, ${input.userId}, 'going', 'organizer')
    `);
    for (const item of input.attachments ?? []) {
      const spec = ATTACH_TABLE[item.kind];
      const found = await tx.execute(sql`select id::text as id from ${sql.raw(spec.source)} where id = ${item.id}::uuid`);
      if (asRows(found).length === 0) continue;
      await tx.execute(sql`
        insert into ${sql.raw(spec.table)} (trip_id, ${sql.raw(spec.column)})
        values (${id}::uuid, ${item.id}::uuid)
        on conflict do nothing
      `);
    }
    return id;
  });
}

export async function setTripGoing(tripId: string, userId: string, going: boolean): Promise<void> {
  const db = getDb();
  if (!going) {
    await db.execute(sql`
      delete from trip_members where trip_id = ${tripId}::uuid and user_id = ${userId}
    `);
    return;
  }
  await db.execute(sql`
    insert into trip_members (trip_id, user_id, rsvp, role)
    values (${tripId}::uuid, ${userId}, 'going', 'member')
    on conflict (trip_id, user_id) do update set rsvp = 'going'
  `);
}

export async function deleteTrip(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from trips
    where id = ${id}::uuid and (${actor.admin} or created_by = ${actor.id})
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export async function listTripsByOwner(userId: string): Promise<TripSummary[]> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title, coalesce(t.trip_date, t.start_at::date)::text as trip_date, t.activity::text as activity,
      t.trailhead_name,
      (select count(*)::int from trip_members tm where tm.trip_id = t.id and tm.rsvp = 'going') as going
    from trips t
    where t.created_by = ${userId}
    order by t.start_at desc nulls last, t.created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{
      id,
      title: text(row.title) ?? 'Trip',
      tripDate: text(row.trip_date),
      activity: text(row.activity),
      trailheadName: text(row.trailhead_name),
      going: num(row.going) ?? 0,
    }];
  });
}

export async function linkPostToTrip(_tripId: string, _postId: string, _authorId: string): Promise<boolean> {
  return false;
}

export async function listTripChoices(): Promise<Array<{ id: string; title: string }>> {
  const result = await getDb().execute(sql`
    select id::text as id, title
    from trips
    order by coalesce(trip_date, start_at::date) desc nulls last, created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{ id, title: text(row.title) ?? 'Trip' }];
  });
}

export async function tripsForItem(kind: 'pin' | 'route' | 'photo', entityId: string): Promise<Array<{ id: string; title: string }>> {
  const table = kind === 'pin' ? 'trip_pins' : kind === 'route' ? 'trip_routes' : 'trip_photos';
  const column = kind === 'pin' ? 'pin_id' : kind === 'route' ? 'track_id' : 'photo_id';
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title
    from ${sql.raw(table)} link
    join trips t on t.id = link.trip_id
    where link.${sql.raw(column)} = ${entityId}::uuid
    order by t.title
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{ id, title: text(row.title) ?? 'Trip' }];
  });
}

export async function attachItemToTrip(input: {
  tripId: string;
  kind: 'pin' | 'route' | 'photo';
  entityId: string;
  actorId: string;
  admin: boolean;
}): Promise<'ok' | 'missing' | 'forbidden'> {
  const owned = await itemOwned(input.kind, input.entityId, input.actorId, input.admin);
  if (owned === 'missing') return 'missing';
  if (owned === 'forbidden') return 'forbidden';
  const trip = await getDb().execute(sql`select id::text as id from trips where id = ${input.tripId}::uuid`);
  if (asRows(trip).length === 0) return 'missing';
  const table = input.kind === 'pin' ? 'trip_pins' : input.kind === 'route' ? 'trip_routes' : 'trip_photos';
  const column = input.kind === 'pin' ? 'pin_id' : input.kind === 'route' ? 'track_id' : 'photo_id';
  await getDb().execute(sql`
    insert into ${sql.raw(table)} (trip_id, ${sql.raw(column)})
    values (${input.tripId}::uuid, ${input.entityId}::uuid)
    on conflict do nothing
  `);
  return 'ok';
}

export async function detachItemFromTrip(input: {
  tripId: string;
  kind: 'pin' | 'route' | 'photo';
  entityId: string;
  actorId: string;
  admin: boolean;
}): Promise<boolean> {
  const owned = await itemOwned(input.kind, input.entityId, input.actorId, input.admin);
  if (owned !== 'ok') return false;
  const table = input.kind === 'pin' ? 'trip_pins' : input.kind === 'route' ? 'trip_routes' : 'trip_photos';
  const column = input.kind === 'pin' ? 'pin_id' : input.kind === 'route' ? 'track_id' : 'photo_id';
  const result = await getDb().execute(sql`
    delete from ${sql.raw(table)}
    where trip_id = ${input.tripId}::uuid and ${sql.raw(column)} = ${input.entityId}::uuid
    returning trip_id::text as id
  `);
  return asRows(result).length > 0;
}

async function itemOwned(kind: 'pin' | 'route' | 'photo', entityId: string, actorId: string, admin: boolean): Promise<'ok' | 'missing' | 'forbidden'> {
  const result = kind === 'pin'
    ? await getDb().execute(sql`select created_by as owner from pins where id = ${entityId}::uuid`)
    : kind === 'route'
      ? await getDb().execute(sql`select user_id as owner from tracks where id = ${entityId}::uuid`)
      : await getDb().execute(sql`select user_id as owner from photos where id = ${entityId}::uuid`);
  const owner = text(asRows(result)[0]?.owner);
  if (asRows(result).length === 0) return 'missing';
  if (!admin && owner !== actorId) return 'forbidden';
  return 'ok';
}

export async function tripIdForReport(_reportId: string): Promise<string | null> {
  return null;
}

export async function trackTotals(): Promise<Array<{ userId: string; activity: string; distanceM: number; elevGainM: number }>> {
  const result = await getDb().execute(sql`
    select user_id, activity::text as activity,
      coalesce(sum(distance_m), 0)::int as distance_m,
      coalesce(sum(elev_gain_m), 0)::int as elev_gain_m
    from tracks
    where user_id is not null
    group by user_id, activity
  `);
  return asRows(result).flatMap((row) => {
    const userId = text(row.user_id);
    const activity = text(row.activity);
    if (!userId || !activity) return [];
    return [{
      userId,
      activity,
      distanceM: num(row.distance_m) ?? 0,
      elevGainM: num(row.elev_gain_m) ?? 0,
    }];
  });
}
