import type { MtnPointBundle } from '@/lib/mountain-weather/mtn-point-types';
import { mtnPointRefForPlace, type MtnPointRef } from '@/lib/mountain-weather/mtn-point-map';
import { readMtnEnhancedIndex, readMtnStandardIndex } from '@/lib/mountain-weather/readers/nws-mtn-xml';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export async function readMtnPointForPlace(placeId: string): Promise<SourceResult<MtnPointBundle> | null> {
  const ref = mtnPointRefForPlace(placeId);
  if (!ref) return null;

  const [standardFile, enhancedFile] = await Promise.all([
    readMtnStandardIndex(ref.office),
    readMtnEnhancedIndex(ref.office),
  ]);

  return assembleBundle(ref, standardFile, enhancedFile);
}

function assembleBundle(
  ref: MtnPointRef,
  standardFile: Awaited<ReturnType<typeof readMtnStandardIndex>>,
  enhancedFile: Awaited<ReturnType<typeof readMtnEnhancedIndex>>,
): SourceResult<MtnPointBundle> {
  const standardPoint = standardFile.data?.[ref.loc] ?? null;
  const enhancedPoint = enhancedFile.data?.[ref.loc] ?? null;
  const hasGust = ref.office === 'BTV';
  const hasIce = ref.office === 'BTV';

  if (standardFile.status === 'error' && enhancedFile.status === 'error') {
    return {
      status: 'error',
      data: null,
      issuedAt: enhancedFile.issuedAt ?? standardFile.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: enhancedFile.sourceUrl,
      error: enhancedFile.error ?? standardFile.error,
    };
  }

  const issuedAt = [enhancedFile.issuedAt, standardFile.issuedAt].find(Boolean) ?? null;
  const status = standardFile.status === 'stale' || enhancedFile.status === 'stale' ? 'stale' : 'ok';

  if (!standardPoint && !enhancedPoint) {
    return {
      status: 'error',
      data: null,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: enhancedFile.sourceUrl || standardFile.sourceUrl,
      error: `No mountain point data for ${ref.loc}`,
    };
  }

  return {
    status,
    data: {
      loc: ref.loc,
      office: ref.office,
      standard: standardPoint,
      enhanced: enhancedPoint,
      hasGust,
      hasIce,
    },
    issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: enhancedFile.sourceUrl || standardFile.sourceUrl,
  };
}
