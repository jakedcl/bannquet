import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { signInAttempts } from '@/db/schema';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export const SIGN_IN_RATE_LIMIT_MESSAGE =
  'Too many tries. Wait a few minutes, then try again.';

function bucketKeys(email: string, ip: string): string[] {
  return [`email:${email}`, `ip:${ip}`];
}

export async function signInRateLimitBlocked(email: string, ip: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const since = new Date(Date.now() - WINDOW_MS);
  const keys = bucketKeys(email, ip);
  const db = getDb();

  for (const bucketKey of keys) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(signInAttempts)
      .where(and(eq(signInAttempts.bucketKey, bucketKey), gte(signInAttempts.attemptedAt, since)));
    if ((row?.count ?? 0) >= MAX_FAILURES) return true;
  }
  return false;
}

export async function recordSignInFailure(email: string, ip: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  const keys = bucketKeys(email, ip);
  await db.insert(signInAttempts).values(keys.map((bucketKey) => ({ bucketKey })));

  const cutoff = new Date(Date.now() - WINDOW_MS * 2);
  await db.delete(signInAttempts).where(sql`${signInAttempts.attemptedAt} < ${cutoff}`);
}

export async function clearSignInFailures(email: string, ip: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  for (const bucketKey of bucketKeys(email, ip)) {
    await db.delete(signInAttempts).where(eq(signInAttempts.bucketKey, bucketKey));
  }
}
