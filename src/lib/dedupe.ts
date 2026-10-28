import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Runs a create inside a transaction that holds a per-member lock for that
 * kind of thing. A double tap sends two requests at once; the second waits
 * here, then sees the first one's row and returns it instead of saving a
 * copy. The lock ends with the transaction.
 */
export async function oneAtATime<T>(scope: string, userId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${scope}), hashtext(${userId}))`);
    return work(tx);
  });
}
