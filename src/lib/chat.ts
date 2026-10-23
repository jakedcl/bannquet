import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { isChatRefKind, type ChatCatalogItem, type ChatMessage, type ChatRef, type ChatRefKind } from '@/lib/chat-view';
import { routeTitle } from '@/lib/route-title';

export type { ChatCatalogItem, ChatMessage, ChatRef, ChatRefKind } from '@/lib/chat-view';
export { formatChatTime, isChatRefKind } from '@/lib/chat-view';

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

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

function refFrom(row: Record<string, unknown>): ChatRef | null {
  const kind = text(row.ref_kind);
  const id = text(row.ref_id);
  if (!kind || !id || !isChatRefKind(kind)) return null;
  if (kind === 'pin') {
    const label = text(row.pin_title);
    return { kind, id, label: label ?? 'Pin', href: `/pins/${id}`, thumb: null, missing: !label };
  }
  if (kind === 'route') {
    const exists = Boolean(text(row.route_id));
    return { kind, id, label: routeTitle(text(row.route_name)), href: `/routes/${id}`, thumb: null, missing: !exists };
  }
  const label = text(row.photo_label);
  const photoUrl = text(row.photo_url);
  const photoThumbUrl = text(row.photo_thumb_url);
  const thumb = photoThumbUrl ?? photoUrl;
  return {
    kind,
    id,
    label: label ?? 'Photo',
    href: `/photos/${id}`,
    thumb,
    photoUrl,
    photoThumbUrl,
    missing: !photoUrl,
  };
}

function mapMessage(row: Record<string, unknown>): ChatMessage | null {
  const id = text(row.id);
  const createdAt = iso(row.created_at);
  if (!id || !createdAt) return null;
  return {
    id,
    userId: text(row.user_id),
    body: text(row.body) ?? '',
    createdAt,
    name: text(row.name) ?? 'Friend',
    handle: text(row.handle),
    ref: refFrom(row),
  };
}

function messageQuery(cursor?: { after: string; afterId: string } | null) {
  const where = cursor
    ? sql`where (m.created_at, m.id) > (${cursor.after}::timestamptz, ${cursor.afterId}::uuid)`
    : sql``;
  const order = cursor
    ? sql`order by m.created_at asc, m.id asc limit 50`
    : sql`order by m.created_at desc, m.id desc limit 80`;
  return sql`
    select m.id::text as id, m.user_id, m.body, m.created_at, m.ref_kind, m.ref_id::text as ref_id,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name,
      u.handle,
      p.title as pin_title,
      t.id::text as route_id,
      t.title as route_name,
      coalesce(ph.caption, ph.alt, 'Photo') as photo_label,
      ph.blob_url as photo_url,
      ph.thumb_url as photo_thumb_url
    from chat_messages m
    left join users u on u.id = m.user_id
    left join pins p on m.ref_kind = 'pin' and p.id = m.ref_id
    left join tracks t on m.ref_kind = 'route' and t.id = m.ref_id
    left join photos ph on m.ref_kind = 'photo' and ph.id = m.ref_id
    ${where}
    ${order}
  `;
}

export async function listChatMessages(cursor?: { after: string; afterId: string } | null): Promise<ChatMessage[]> {
  const result = await getDb().execute(messageQuery(cursor));
  const messages = asRows(result).flatMap((row) => {
    const message = mapMessage(row);
    return message ? [message] : [];
  });
  return cursor ? messages : messages.reverse();
}

export async function sendChatMessage(input: {
  userId: string;
  body: string;
  refKind: ChatRefKind | null;
  refId: string | null;
}): Promise<'ok' | 'empty' | 'missing'> {
  const body = input.body.trim().slice(0, 500);
  if (!body && !input.refId) return 'empty';
  if (input.refKind && input.refId) {
    const exists = await existsRef(input.refKind, input.refId);
    if (!exists) return 'missing';
  }
  if (input.refKind && input.refId) {
    await getDb().execute(sql`
      insert into chat_messages (user_id, body, ref_kind, ref_id)
      values (${input.userId}, ${body}, ${input.refKind}, ${input.refId}::uuid)
    `);
  } else {
    await getDb().execute(sql`
      insert into chat_messages (user_id, body)
      values (${input.userId}, ${body})
    `);
  }
  return 'ok';
}

export async function deleteChatMessage(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from chat_messages
    where id = ${id}::uuid and (${actor.admin} or user_id = ${actor.id})
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

async function existsRef(kind: ChatRefKind, id: string): Promise<boolean> {
  const result = kind === 'pin'
    ? await getDb().execute(sql`select id::text as id from pins where id = ${id}::uuid`)
    : kind === 'route'
      ? await getDb().execute(sql`select id::text as id from tracks where id = ${id}::uuid`)
      : await getDb().execute(sql`select id::text as id from photos where id = ${id}::uuid`);
  return asRows(result).length > 0;
}

export async function listChatCatalog(): Promise<ChatCatalogItem[]> {
  const db = getDb();
  const [pins, routes, photos] = await Promise.all([
    db.execute(sql`
      select p.id::text as id, p.title as label, p.created_by as owner_id,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as owner_name
      from pins p
      left join users u on u.id = p.created_by
      order by p.created_at desc
    `),
    db.execute(sql`
      select t.id::text as id, t.title as label, t.user_id as owner_id,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as owner_name
      from tracks t
      left join users u on u.id = t.user_id
      order by t.created_at desc
    `),
    db.execute(sql`
      select ph.id::text as id, coalesce(ph.caption, ph.alt, 'Photo') as label,
        ph.blob_url as photo_url, ph.thumb_url as photo_thumb_url,
        ph.user_id as owner_id,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as owner_name
      from photos ph
      left join users u on u.id = ph.user_id
      order by ph.created_at desc
    `),
  ]);
  const pinsOut = asRows(pins).flatMap((row) => catalogRow(row, 'pin'));
  const routesOut = asRows(routes).flatMap((row) => catalogRow(row, 'route'));
  const photosOut = asRows(photos).flatMap((row) => catalogRow(row, 'photo'));
  return [...pinsOut, ...routesOut, ...photosOut];
}

function catalogRow(row: Record<string, unknown>, kind: ChatRefKind): ChatCatalogItem[] {
  const id = text(row.id);
  if (!id) return [];
  const href = kind === 'pin' ? `/pins/${id}` : kind === 'route' ? `/routes/${id}` : `/photos/${id}`;
  return [{
    kind,
    id,
    label: kind === 'route' ? routeTitle(text(row.label)) : (text(row.label) ?? (kind === 'pin' ? 'Pin' : 'Photo')),
    href,
    thumb: text(row.photo_thumb_url) ?? text(row.photo_url),
    photoUrl: kind === 'photo' ? text(row.photo_url) : null,
    photoThumbUrl: kind === 'photo' ? text(row.photo_thumb_url) : null,
    ownerId: text(row.owner_id),
    ownerName: text(row.owner_name) ?? 'Friend',
  }];
}
