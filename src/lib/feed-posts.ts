import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { oneAtATime } from '@/lib/dedupe';
import {
  attachToNewPost,
  filterOwnedAttachments,
  listPostAttachments,
  savePostAttachments,
  type PostAttachment,
} from '@/lib/post-attachments';

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

export type PostSummary = {
  id: string;
  title: string;
  createdAt: string;
  authorId: string | null;
  authorName: string | null;
  authorHandle: string | null;
};

export type PostDetail = PostSummary & {
  body: string;
  updatedAt: string;
  attachments: PostAttachment[];
};

function mapSummary(row: Record<string, unknown>): PostSummary | null {
  const id = text(row.id);
  if (!id) return null;
  return {
    id,
    title: text(row.title) ?? 'Post',
    createdAt: text(row.created_at) ?? '',
    authorId: text(row.created_by),
    authorName: text(row.author_name),
    authorHandle: text(row.author_handle),
  };
}

export async function listPosts(): Promise<PostSummary[]> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.title, p.created_at::text as created_at, p.created_by,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as author_name,
      u.handle as author_handle
    from posts p
    left join users u on u.id = p.created_by
    order by p.created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const item = mapSummary(row);
    return item ? [item] : [];
  });
}

export async function listPostsPeek(limit: number): Promise<PostSummary[]> {
  const capped = Math.max(1, Math.min(limit, 20));
  const result = await getDb().execute(sql`
    select p.id::text as id, p.title, p.created_at::text as created_at, p.created_by,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as author_name,
      u.handle as author_handle
    from posts p
    left join users u on u.id = p.created_by
    order by p.created_at desc
    limit ${capped}
  `);
  return asRows(result).flatMap((row) => {
    const item = mapSummary(row);
    return item ? [item] : [];
  });
}

export async function listPostsByOwner(userId: string): Promise<PostSummary[]> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.title, p.created_at::text as created_at, p.created_by,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as author_name,
      u.handle as author_handle
    from posts p
    left join users u on u.id = p.created_by
    where p.created_by = ${userId}
    order by p.created_at desc
  `);
  return asRows(result).flatMap((row) => {
    const item = mapSummary(row);
    return item ? [item] : [];
  });
}

export async function getPost(id: string): Promise<PostDetail | null> {
  const result = await getDb().execute(sql`
    select p.id::text as id, p.title, p.body, p.created_at::text as created_at,
      p.updated_at::text as updated_at, p.created_by,
      coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as author_name,
      u.handle as author_handle
    from posts p
    left join users u on u.id = p.created_by
    where p.id = ${id}::uuid
  `);
  const row = asRows(result)[0];
  const summary = row ? mapSummary(row) : null;
  if (!summary) return null;
  const attachments = await listPostAttachments(id);
  return {
    ...summary,
    body: text(row.body) ?? '',
    updatedAt: text(row.updated_at) ?? summary.createdAt,
    attachments,
  };
}

export async function createPost(input: {
  userId: string;
  title: string;
  body: string;
  attachments?: Array<{ kind: 'pin' | 'route' | 'photo'; id: string }>;
  admin?: boolean;
}): Promise<string> {
  return oneAtATime('post', input.userId, async (tx) => {
    const existing = await tx.execute(sql`
      select id::text as id from posts
      where created_by = ${input.userId} and title = ${input.title}
        and created_at > now() - interval '2 minutes'
      limit 1
    `);
    const existingId = text(asRows(existing)[0]?.id);
    if (existingId) return existingId;
    const inserted = await tx.execute(sql`
      insert into posts (title, body, created_by)
      values (${input.title}, ${input.body}, ${input.userId})
      returning id::text as id
    `);
    const id = text(asRows(inserted)[0]?.id);
    if (!id) throw new Error('Could not save that post.');
    const attachments = await filterOwnedAttachments(input.attachments ?? [], input.userId, input.admin ?? false);
    await attachToNewPost(tx, id, attachments);
    return id;
  });
}

export async function updatePost(input: {
  id: string;
  title: string;
  body: string;
  actor: { id: string; admin: boolean };
  attachments?: Array<{ kind: 'pin' | 'route' | 'photo'; id: string }>;
}): Promise<boolean> {
  const row = await getDb().execute(sql`
    select created_by::text as created_by from posts where id = ${input.id}::uuid
  `);
  if (asRows(row).length === 0) return false;
  const owner = text(asRows(row)[0]?.created_by);
  if (!input.actor.admin && owner !== input.actor.id) return false;
  const result = await getDb().execute(sql`
    update posts
    set title = ${input.title}, body = ${input.body}, updated_at = now()
    where id = ${input.id}::uuid
    returning id::text as id
  `);
  if (asRows(result).length === 0) return false;
  if (input.attachments) {
    const attachments = await filterOwnedAttachments(input.attachments, input.actor.id, input.actor.admin);
    await savePostAttachments(input.id, attachments);
  }
  return true;
}

export async function deletePost(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const row = await getDb().execute(sql`
    select created_by::text as created_by from posts where id = ${id}::uuid
  `);
  if (asRows(row).length === 0) return false;
  const owner = text(asRows(row)[0]?.created_by);
  if (!actor.admin && owner !== actor.id) return false;
  const result = await getDb().execute(sql`
    delete from posts where id = ${id}::uuid returning id::text as id
  `);
  return asRows(result).length > 0;
}
