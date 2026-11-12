import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { routeTitle } from '@/lib/route-title';

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

export type AttachKind = 'pin' | 'route' | 'photo';

export type PostAttachment = {
  kind: AttachKind;
  id: string;
  label: string;
  href: string;
  thumb: string | null;
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
  ownerId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ATTACH_TABLE = {
  pin: { table: 'post_pins', column: 'pin_id', source: 'pins' },
  route: { table: 'post_routes', column: 'track_id', source: 'tracks' },
  photo: { table: 'post_photos', column: 'photo_id', source: 'photos' },
} as const;

export function readAttachments(formData: FormData): Array<{ kind: AttachKind; id: string }> {
  const out: Array<{ kind: AttachKind; id: string }> = [];
  const seen = new Set<string>();
  for (const kind of ['pin', 'route', 'photo'] as const) {
    for (const value of formData.getAll(kind)) {
      if (typeof value !== 'string' || !UUID.test(value)) continue;
      const key = `${kind}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, id: value });
      if (out.length >= 40) return out;
    }
  }
  return out;
}

async function itemOwner(kind: AttachKind, entityId: string): Promise<string | 'missing'> {
  const result = kind === 'pin'
    ? await getDb().execute(sql`select created_by as owner from pins where id = ${entityId}::uuid`)
    : kind === 'route'
      ? await getDb().execute(sql`select user_id as owner from tracks where id = ${entityId}::uuid`)
      : await getDb().execute(sql`select user_id as owner from photos where id = ${entityId}::uuid`);
  if (asRows(result).length === 0) return 'missing';
  const owner = text(asRows(result)[0]?.owner);
  return owner ?? 'missing';
}

async function itemOwned(
  kind: AttachKind,
  entityId: string,
  actorId: string,
  admin: boolean,
): Promise<'ok' | 'missing' | 'forbidden'> {
  const owner = await itemOwner(kind, entityId);
  if (owner === 'missing') return 'missing';
  if (!admin && owner !== actorId) return 'forbidden';
  return 'ok';
}

export async function filterOwnedAttachments(
  attachments: Array<{ kind: AttachKind; id: string }>,
  actorId: string,
  admin: boolean,
): Promise<Array<{ kind: AttachKind; id: string }>> {
  const out: Array<{ kind: AttachKind; id: string }> = [];
  for (const item of attachments) {
    if ((await itemOwned(item.kind, item.id, actorId, admin)) === 'ok') out.push(item);
  }
  return out;
}

export async function listPostAttachments(postId: string): Promise<PostAttachment[]> {
  const result = await getDb().execute(sql`
    select 'pin' as kind, p.id::text as id, p.title as label, null::text as thumb, null::text as thumb_url, p.created_by as owner_id
    from post_pins pp
    join pins p on p.id = pp.pin_id
    where pp.post_id = ${postId}::uuid
    union all
    select 'route', t.id::text, t.title, null::text, null::text, t.user_id
    from post_routes pr
    join tracks t on t.id = pr.track_id
    where pr.post_id = ${postId}::uuid
    union all
    select 'photo', ph.id::text, coalesce(ph.caption, ph.alt, 'Photo'), ph.blob_url, ph.thumb_url, ph.user_id
    from post_photos pp
    join photos ph on ph.id = pp.photo_id
    where pp.post_id = ${postId}::uuid
  `);
  return asRows(result).flatMap((item) => {
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
      ownerId: text(item.owner_id),
    }];
  });
}

type DbLike = Pick<ReturnType<typeof getDb>, 'execute'>;

async function insertAttachments(
  tx: DbLike,
  postId: string,
  attachments: Array<{ kind: AttachKind; id: string }>,
): Promise<void> {
  for (const item of attachments) {
    const spec = ATTACH_TABLE[item.kind];
    const found = await tx.execute(sql`select id::text as id from ${sql.raw(spec.source)} where id = ${item.id}::uuid`);
    if (asRows(found).length === 0) continue;
    await tx.execute(sql`
      insert into ${sql.raw(spec.table)} (post_id, ${sql.raw(spec.column)})
      values (${postId}::uuid, ${item.id}::uuid)
      on conflict do nothing
    `);
  }
}

export async function savePostAttachments(
  postId: string,
  attachments: Array<{ kind: AttachKind; id: string }>,
): Promise<void> {
  const db = getDb();
  await db.execute(sql`delete from post_pins where post_id = ${postId}::uuid`);
  await db.execute(sql`delete from post_routes where post_id = ${postId}::uuid`);
  await db.execute(sql`delete from post_photos where post_id = ${postId}::uuid`);
  await insertAttachments(db, postId, attachments);
}

export async function attachToNewPost(
  tx: DbLike,
  postId: string,
  attachments: Array<{ kind: AttachKind; id: string }>,
): Promise<void> {
  await insertAttachments(tx, postId, attachments);
}
