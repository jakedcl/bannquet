import { sql } from 'drizzle-orm';
import { getDb, type Database } from '@/db';
import { TOMVANZ_EXTERNAL_SOURCE } from './constants';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

export async function isSyncExcluded(externalSource: string, externalId: string): Promise<boolean> {
  const result = await getDb().execute(sql`
    select 1 from sync_exclusions
    where external_source = ${externalSource} and external_id = ${externalId}
    limit 1
  `);
  return asRows(result).length > 0;
}

/** Called when an author or admin deletes a synced row through normal Bannquet UI. */
export async function recordSyncExclusion(
  tx: Pick<Database, 'execute'>,
  externalSource: string | null | undefined,
  externalId: string | null | undefined,
): Promise<void> {
  if (!externalSource || !externalId) return;
  await tx.execute(sql`
    insert into sync_exclusions (external_source, external_id)
    values (${externalSource}, ${externalId})
    on conflict (external_source, external_id) do nothing
  `);
}

export async function listTomvanzSyncedExternalIds(): Promise<string[]> {
  const db = getDb();
  const [photos, tracks] = await Promise.all([
    db.execute(sql`
      select external_id from photos
      where external_source = ${TOMVANZ_EXTERNAL_SOURCE} and external_id is not null
    `),
    db.execute(sql`
      select external_id from tracks
      where external_source = ${TOMVANZ_EXTERNAL_SOURCE} and external_id is not null
    `),
  ]);
  const ids = new Set<string>();
  for (const row of [...asRows(photos), ...asRows(tracks)]) {
    const id = row.external_id;
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  }
  return [...ids];
}