import { sql } from 'drizzle-orm';
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

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  tripId: string | null;
  createdAt: string;
  readAt: string | null;
};

const LIST_CAP = 40;

export async function insertNotification(input: {
  userId: string;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
  tripId?: string | null;
}): Promise<void> {
  await getDb().execute(sql`
    insert into notifications (user_id, kind, title, body, href, trip_id)
    values (
      ${input.userId},
      ${input.kind},
      ${input.title},
      ${input.body},
      ${input.href ?? null},
      ${input.tripId ? sql`${input.tripId}::uuid` : sql`null`}
    )
  `);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const result = await getDb().execute(sql`
    select count(*)::int as n
    from notifications
    where user_id = ${userId} and read_at is null
  `);
  const row = asRows(result)[0];
  const n = row?.n;
  return typeof n === 'number' ? n : Number(n) || 0;
}

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const result = await getDb().execute(sql`
    select
      id::text as id,
      kind,
      title,
      body,
      href,
      trip_id::text as trip_id,
      read_at::text as read_at,
      created_at::text as created_at
    from notifications
    where user_id = ${userId}
    order by created_at desc
    limit ${LIST_CAP}
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    const kind = text(row.kind);
    const title = text(row.title);
    const body = text(row.body);
    if (!id || !kind || !title || !body) return [];
    return [{
      id,
      kind,
      title,
      body,
      href: text(row.href),
      tripId: text(row.trip_id),
      createdAt: text(row.created_at) ?? '',
      readAt: text(row.read_at),
    }];
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await getDb().execute(sql`
    update notifications
    set read_at = now()
    where user_id = ${userId} and read_at is null
  `);
}
