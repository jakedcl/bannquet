#!/usr/bin/env tsx
/**
 * One-way import of published photos and tracks from tomvanz.com (Sanity) into Bannquet.
 *
 * Dry run:  npx tsx scripts/sync-tomvanz.ts --dry-run
 * Import:   npx tsx scripts/sync-tomvanz.ts
 * Re-sync:  npx tsx scripts/sync-tomvanz.ts --force
 *
 * Requires DATABASE_URL (preview branch for local dev) and BLOB_READ_WRITE_TOKEN for real runs.
 */
import { closeDb } from '@/db';
import { runTomvanzSync } from '@/lib/tomvanz-sync/run-all';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

async function main() {
  const stats = await runTomvanzSync(dryRun, force);
  const mode = dryRun ? 'dry-run' : 'sync';
  console.log(`[tomvanz-${mode}] created=${stats.created} updated=${stats.updated} adopted=${stats.adopted}`);
  console.log(`[tomvanz-${mode}] skipped=${stats.skipped} excluded=${stats.excluded} deleted=${stats.deleted} failed=${stats.failed}`);
  if (stats.failures.length > 0) {
    console.log('[tomvanz] failures:');
    for (const failure of stats.failures) {
      console.log(`  ${failure.id}: ${failure.detail ?? 'failed'}`);
    }
  }
  await closeDb();
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb();
  process.exitCode = 1;
});