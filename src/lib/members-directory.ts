import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export type DirectoryMember = {
  id: string;
  handle: string | null;
  name: string;
  avatarUrl: string | null;
  region: string | null;
  climbs: number;
  routes: number;
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

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listApprovedMembers(): Promise<DirectoryMember[]> {
  const result = await getDb().execute(sql`
    select u.id, u.handle, u.display_name, u.avatar_url, u.home_region,
      (select count(*)::int from summits s where s.user_id = u.id) as climbs,
      (select count(*)::int from tracks t where t.user_id = u.id) as routes
    from users u
    where u.role in ('member', 'admin')
  `);
  return asRows(result).flatMap((row) => {
    const id = text(row.id);
    if (!id) return [];
    const handle = text(row.handle);
    const displayName = text(row.display_name);
    return [{
      id,
      handle,
      name: displayName || handle || 'Friend',
      avatarUrl: text(row.avatar_url),
      region: text(row.home_region),
      climbs: num(row.climbs),
      routes: num(row.routes),
    }];
  });
}
