/** Normalize Neon/Vercel Postgres URLs so node-postgres uses verify-full explicitly. */
export function databaseConnectionString(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      return raw;
    }
    parsed.searchParams.set('sslmode', 'verify-full');
    return parsed.toString();
  } catch {
    return raw;
  }
}
