import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export const GALLERY_PAGE = 48;

export type GalleryPhoto = { id: string; url: string; thumbUrl: string | null; caption: string | null };

/** Keyset cursor for "older than this photo": `<created_at ISO>~<id>`. */
export type GalleryCursor = { at: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: GalleryCursor): string {
  return `${cursor.at}~${cursor.id}`;
}

export function parseCursor(raw: string | undefined | null): GalleryCursor | null {
  if (!raw) return null;
  const [at, id, extra] = raw.split('~');
  if (extra !== undefined || !at || !id || !UUID.test(id)) return null;
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return null;
  return { at: new Date(time).toISOString(), id: id.toLowerCase() };
}

const HANDLE = /^[a-z0-9_-]{1,40}$/i;

export function cleanHandle(raw: string | undefined | null): string | null {
  const value = String(raw ?? '').trim();
  return HANDLE.test(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function rows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const list = (result as { rows?: unknown })?.rows;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

/** Newest first, one page at a time, optionally one member's photos. */
export async function listGalleryPhotos(input: {
  handle: string | null;
  before: GalleryCursor | null;
}): Promise<{ photos: GalleryPhoto[]; next: string | null }> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.blob_url as url, p.thumb_url, p.caption,
      to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at
    from photos p
    left join users u on u.id = p.user_id
    where (${input.handle}::text is null or lower(u.handle) = lower(${input.handle}::text))
      and (${input.before?.at ?? null}::timestamptz is null
        or (p.created_at, p.id) < (${input.before?.at ?? null}::timestamptz, ${input.before?.id ?? null}::uuid))
    order by p.created_at desc, p.id desc
    limit ${GALLERY_PAGE + 1}
  `);
  const list = rows(result);
  const photos = list.slice(0, GALLERY_PAGE).flatMap((row) => {
    const id = text(row.id);
    const url = text(row.url);
    if (!id || !url) return [];
    return [{ id, url, thumbUrl: text(row.thumb_url), caption: text(row.caption) }];
  });
  const last = list[GALLERY_PAGE - 1];
  const lastAt = text(last?.at);
  const lastId = text(last?.id);
  const next = list.length > GALLERY_PAGE && lastAt && lastId ? encodeCursor({ at: lastAt, id: lastId }) : null;
  return { photos, next };
}

/** Members who have posted photos, for the filter. */
export async function listPhotoMembers(): Promise<Array<{ handle: string; name: string }>> {
  const result = await getDb().execute(sql`
    select u.handle, coalesce(nullif(u.display_name, ''), u.handle) as name, max(p.created_at) as latest
    from photos p
    join users u on u.id = p.user_id
    where u.handle is not null and u.handle <> ''
    group by u.handle, u.display_name
    order by latest desc
  `);
  return rows(result).flatMap((row) => {
    const handle = text(row.handle);
    if (!handle) return [];
    return [{ handle, name: text(row.name) ?? handle }];
  });
}
