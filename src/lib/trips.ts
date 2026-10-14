import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import type { Activity } from '@/lib/activities';
import { gramsToOunces, ouncesToGrams, type PackingTemplate } from '@/lib/packing';

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

export type PackingRow = {
  id: string;
  label: string;
  ounces: number | null;
  assignedTo: string | null;
  assignedName: string | null;
};

export type TripDetail = TripSummary & {
  lat: number | null;
  lng: number | null;
  createdBy: string | null;
  people: TripPerson[];
  items: PackingRow[];
  posts: Array<{ id: string; title: string; tripDate: string | null }>;
};

export async function listTrips(): Promise<TripSummary[]> {
  const result = await getDb().execute(sql`
    select t.id::text as id, t.title, t.start_at::date::text as trip_date, t.activity::text as activity,
      t.trailhead_name,
      (select count(*)::int from trip_members tm where tm.trip_id = t.id and tm.rsvp = 'going') as going
    from trips t
    order by t.start_at asc nulls last, t.created_at desc
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
  const [tripResult, peopleResult, itemResult, postResult] = await Promise.all([
    db.execute(sql`
      select t.id::text as id, t.title, t.start_at::date::text as trip_date, t.activity::text as activity,
        t.trailhead_name, t.created_by,
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
      select i.id::text as id, i.label, i.weight_g, i.assigned_to,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), null) as assigned_name
      from packing_list_items i
      join packing_lists l on l.id = i.list_id
      left join users u on u.id = i.assigned_to
      where l.trip_id = ${id}::uuid
      order by i.label
    `),
    db.execute(sql`
      select id::text as id, title, trip_date::text as trip_date
      from trip_reports
      where trip_id = ${id}::uuid and published = true
      order by trip_date desc nulls last
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
    people: asRows(peopleResult).flatMap((person) => {
      const personId = text(person.id);
      if (!personId) return [];
      return [{ id: personId, name: text(person.name) ?? 'Friend', handle: text(person.handle) }];
    }),
    items: asRows(itemResult).flatMap((item) => {
      const itemId = text(item.id);
      if (!itemId) return [];
      const grams = num(item.weight_g);
      return [{
        id: itemId,
        label: text(item.label) ?? 'Item',
        ounces: grams == null ? null : gramsToOunces(grams),
        assignedTo: text(item.assigned_to),
        assignedName: text(item.assigned_name),
      }];
    }),
    posts: asRows(postResult).flatMap((post) => {
      const postId = text(post.id);
      if (!postId) return [];
      return [{ id: postId, title: text(post.title) ?? 'Post', tripDate: text(post.trip_date) }];
    }),
  };
}

function tripSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'trip';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createTrip(input: {
  userId: string;
  title: string;
  tripDate: string;
  activity: Activity;
  trailheadName: string;
  lat: number;
  lng: number;
  template: PackingTemplate;
}): Promise<string> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      insert into trips (title, slug, activity, start_at, trailhead_point, trailhead_name, status, created_by)
      values (
        ${input.title},
        ${tripSlug(input.title)},
        ${input.activity}::activity,
        ${input.tripDate}::date,
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
        ${input.trailheadName || null},
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
    const list = await tx.execute(sql`
      insert into packing_lists (trip_id, name)
      values (${id}::uuid, ${input.template.name})
      returning id::text as id
    `);
    const listId = text(asRows(list)[0]?.id);
    if (!listId) throw new Error('Could not save the packing list.');
    for (const item of input.template.items) {
      const grams = item.ounces ? ouncesToGrams(item.ounces) : null;
      await tx.execute(sql`
        insert into packing_list_items (list_id, label, weight_g, shared)
        values (${listId}::uuid, ${item.label}, ${grams}, true)
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

export async function claimPackingItem(itemId: string, userId: string): Promise<void> {
  await getDb().execute(sql`
    update packing_list_items
    set assigned_to = case when assigned_to = ${userId} then null else ${userId} end
    where id = ${itemId}::uuid
  `);
}

export async function setPackingWeight(itemId: string, ounces: number | null): Promise<void> {
  const grams = ounces == null ? null : ouncesToGrams(ounces);
  await getDb().execute(sql`
    update packing_list_items set weight_g = ${grams} where id = ${itemId}::uuid
  `);
}

export async function addPackingItem(tripId: string, label: string): Promise<void> {
  await getDb().execute(sql`
    insert into packing_list_items (list_id, label, shared)
    select id, ${label}, true from packing_lists where trip_id = ${tripId}::uuid limit 1
  `);
}

export async function linkPostToTrip(tripId: string, postId: string, authorId: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    update trip_reports
    set trip_id = ${tripId}::uuid
    where id = ${postId}::uuid and author_id = ${authorId} and published = true
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export async function listAuthorPosts(authorId: string): Promise<Array<{ id: string; title: string; tripId: string | null }>> {
  const result = await getDb().execute(sql`
    select id::text as id, title, trip_id::text as trip_id
    from trip_reports
    where author_id = ${authorId} and published = true
    order by trip_date desc nulls last, created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    return [{ id, title: text(row.title) ?? 'Post', tripId: text(row.trip_id) }];
  });
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
