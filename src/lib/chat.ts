import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { isChatRefKind, type ChatMessage, type ChatRef, type ChatRefKind } from '@/lib/chat-view';

export type { ChatMessage, ChatRef, ChatRefKind } from '@/lib/chat-view';
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
    const label = text(row.route_name);
    return { kind, id, label: label ?? 'Route', href: `/routes/${id}`, thumb: null, missing: !label };
  }
  const label = text(row.photo_label);
  const thumb = text(row.photo_url);
  return {
    kind,
    id,
    label: label ?? 'Photo',
    href: `/photos/${id}`,
    thumb,
    missing: !thumb,
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
      t.name as route_name,
      coalesce(ph.caption, ph.alt, 'Photo') as photo_label,
      ph.blob_url as photo_url
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
    const owned = await ownsRef(input.userId, input.refKind, input.refId);
    if (!owned) return 'missing';
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

async function ownsRef(userId: string, kind: ChatRefKind, id: string): Promise<boolean> {
  const result = kind === 'pin'
    ? await getDb().execute(sql`select id::text as id from pins where id = ${id}::uuid and created_by = ${userId}`)
    : kind === 'route'
      ? await getDb().execute(sql`select id::text as id from tracks where id = ${id}::uuid and user_id = ${userId}`)
      : await getDb().execute(sql`select id::text as id from photos where id = ${id}::uuid and user_id = ${userId}`);
  return asRows(result).length > 0;
}
