import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { signInAttempts } from '@/db/schema';
import { RATE_LIMIT_WINDOW_MS, resetBuckets, signInBuckets, type Bucket } from '@/lib/auth/rate-limit-buckets';

export const SIGN_IN_RATE_LIMIT_MESSAGE =
  'Too many tries. Wait a few minutes, then try again.';

export type SignInRateLimitBuckets = {
  ip: string;
  email?: string;
  login?: string;
};

export function loginRateLimitKey(loginRaw: string): string {
  return loginRaw.trim().toLowerCase();
}

async function anyFull(buckets: Bucket[]): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const db = getDb();
  for (const bucket of buckets) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(signInAttempts)
      .where(and(eq(signInAttempts.bucketKey, bucket.key), gte(signInAttempts.attemptedAt, since)));
    if ((row?.count ?? 0) >= bucket.max) return true;
  }
  return false;
}

async function record(buckets: Bucket[]): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db.insert(signInAttempts).values(buckets.map((bucket) => ({ bucketKey: bucket.key })));
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS * 2);
  await db.delete(signInAttempts).where(sql`${signInAttempts.attemptedAt} < ${cutoff}`);
}

export async function signInRateLimitBlocked(buckets: SignInRateLimitBuckets): Promise<boolean> {
  return anyFull(signInBuckets(buckets));
}

export async function recordSignInFailure(buckets: SignInRateLimitBuckets): Promise<void> {
  await record(signInBuckets(buckets));
}

/** A good sign-in clears that account's tries from this network only. */
export async function clearSignInFailures(buckets: SignInRateLimitBuckets): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const keys = signInBuckets(buckets).filter((bucket) => bucket.key.startsWith('acct:')).map((bucket) => bucket.key);
  if (keys.length === 0) return;
  await getDb().delete(signInAttempts).where(inArray(signInAttempts.bucketKey, keys));
}

/** Counts every reset request. True when this address or network asked too often. */
export async function resetRequestBlocked(input: { ip: string; email: string }): Promise<boolean> {
  const buckets = resetBuckets(input);
  if (await anyFull(buckets)) return true;
  await record(buckets);
  return false;
}
