import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

/** Returns true when this idempotency key is new and should be processed. */
export async function claimWebhookIdempotency(idempotencyKey: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute(sql`
    insert into webhook_deliveries (idempotency_key)
    values (${idempotencyKey})
    on conflict (idempotency_key) do nothing
    returning idempotency_key
  `);
  return asRows(result).length > 0;
}