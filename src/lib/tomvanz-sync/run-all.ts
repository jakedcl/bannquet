import { listTomvanzSyncedExternalIds } from './exclusions';
import { listPublishedSanityDocs } from './sanity';
import { syncOne, type SyncOneOutcome } from './sync-one';

export type SyncRunStats = Record<SyncOneOutcome, number> & {
  failures: Array<{ id: string; detail?: string }>;
};

function emptyStats(): SyncRunStats {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    adopted: 0,
    excluded: 0,
    deleted: 0,
    failed: 0,
    failures: [],
  };
}

export async function runTomvanzSync(dryRun: boolean, force = false): Promise<SyncRunStats> {
  const stats = emptyStats();
  const docs = await listPublishedSanityDocs();
  const sanityIds = new Set(docs.map((doc) => doc._id));

  for (const doc of docs) {
    try {
      const result = await syncOne(doc._id, { dryRun, force });
      stats[result.outcome] += 1;
      if (result.outcome === 'failed') stats.failures.push({ id: doc._id, detail: result.detail });
    } catch (error) {
      stats.failed += 1;
      stats.failures.push({
        id: doc._id,
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const linked = await listTomvanzSyncedExternalIds();
  for (const id of linked) {
    if (sanityIds.has(id)) continue;
    try {
      const result = await syncOne(id, { dryRun, force });
      stats[result.outcome] += 1;
      if (result.outcome === 'failed') stats.failures.push({ id, detail: result.detail });
    } catch (error) {
      stats.failed += 1;
      stats.failures.push({
        id,
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return stats;
}