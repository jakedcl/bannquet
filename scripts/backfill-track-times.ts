/**
 * Fill missing started_at / ended_at on tracks when an external source still has times.
 *
 * Member-uploaded GPX is not kept in the database, so those routes cannot be re-parsed here.
 *
 * Dry run (default): npx tsx scripts/backfill-track-times.ts
 * Apply:           npx tsx scripts/backfill-track-times.ts --write
 * Tomvanz only:    npx tsx scripts/backfill-track-times.ts --write --tomvanz-only
 */
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { activityTime } from '@/lib/gpx';
import { TOMVANZ_EXTERNAL_SOURCE } from '@/lib/tomvanz-sync/constants';
import { fetchSanityTrack } from '@/lib/tomvanz-sync/sanity';

function args() {
  return {
    write: process.argv.includes('--write'),
    tomvanzOnly: process.argv.includes('--tomvanz-only'),
  };
}

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

async function main() {
  const { write, tomvanzOnly } = args();
  const db = getDb();
  const rows = await db.execute(sql`
    select id::text as id, external_id, external_source, started_at, ended_at
    from tracks
    where (started_at is null or ended_at is null)
    order by created_at
  `);

  let examined = 0;
  let wouldUpdate = 0;
  let updated = 0;
  let skippedGpx = 0;

  for (const row of asRows(rows)) {
    const id = text(row.id);
    if (!id) continue;
    examined += 1;
    const externalSource = text(row.external_source);
    const externalId = text(row.external_id);

    if (externalSource === TOMVANZ_EXTERNAL_SOURCE && externalId) {
      const doc = await fetchSanityTrack(externalId);
      if (!doc) continue;
      const startedAt = doc.startedAt ? activityTime(doc.startedAt) : null;
      const endedAt = doc.endedAt ? activityTime(doc.endedAt) : null;
      if (!startedAt && !endedAt) continue;
      const patchStarted = row.started_at == null && startedAt;
      const patchEnded = row.ended_at == null && endedAt;
      if (!patchStarted && !patchEnded) continue;
      wouldUpdate += 1;
      console.log(`[tomvanz] track ${id}: started=${patchStarted ? startedAt : '—'} ended=${patchEnded ? endedAt : '—'}`);
      if (write) {
        await db.execute(sql`
          update tracks set
            started_at = case when started_at is null then ${startedAt}::timestamptz else started_at end,
            ended_at = case when ended_at is null then ${endedAt}::timestamptz else ended_at end
          where id = ${id}::uuid
            and (started_at is null or ended_at is null)
        `);
        updated += 1;
      }
      continue;
    }

    if (tomvanzOnly) continue;

    if (externalSource || externalId) {
      skippedGpx += 1;
      continue;
    }

    skippedGpx += 1;
  }

  console.log(`examined=${examined} would_update=${wouldUpdate} updated=${updated} skipped_no_gpx=${skippedGpx}`);
  console.log('Member GPX files are not stored; re-upload or use Tomvanz sync data to recover times.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});