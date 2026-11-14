import type { SourceStatus } from '@/lib/mountain-weather/source-types';

/** Classify a product as fresh or stale from its issued time and expected cadence. */
export function freshnessFromIssued(
  issuedAt: string | null,
  expectedEveryHours = 3,
  now = Date.now(),
): Exclude<SourceStatus, 'seasonal-off' | 'link-only' | 'error'> {
  if (!issuedAt) return 'ok';
  const issued = new Date(issuedAt).getTime();
  if (Number.isNaN(issued)) return 'ok';
  const ageHours = (now - issued) / (1000 * 60 * 60);
  const staleAfter = expectedEveryHours * 2;
  return ageHours > staleAfter ? 'stale' : 'ok';
}

export function mergeFreshness<T, R extends { status: SourceStatus; data: T | null }>(
  freshness: ReturnType<typeof freshnessFromIssued>,
  result: R,
): R {
  if (result.status === 'error' || result.status === 'link-only' || result.status === 'seasonal-off') {
    return result;
  }
  if (freshness === 'stale' && result.data) {
    return { ...result, status: 'stale' };
  }
  return result;
}
