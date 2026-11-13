import type { BalloonPlaceSlice } from '@/lib/mountain-weather/balloon-types';
import { pickBalloonRegion } from '@/lib/mountain-weather/parse/balloon';
import { readBtvBalloonForecast } from '@/lib/mountain-weather/readers/nws-btv-balloon';
import { sourceBindingForPlace, type BalloonPlaceBinding } from '@/lib/mountain-weather/source-bindings';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export async function readBalloonForPlace(placeId: string): Promise<SourceResult<BalloonPlaceSlice> | null> {
  const binding = sourceBindingForPlace(placeId)?.balloon;
  if (!binding) return null;

  const bulletin = await readBtvBalloonForecast();
  if (bulletin.status === 'error' || !bulletin.data) {
    return { ...bulletin, data: null };
  }

  const region = pickBalloonRegion(bulletin.data, binding.regionMatch);
  if (!region) {
    return {
      status: 'error',
      data: null,
      issuedAt: bulletin.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bulletin.sourceUrl,
      error: `No balloon region matching “${binding.regionMatch}”`,
    };
  }

  const status = region.seasonalOff ? 'seasonal-off' : bulletin.status;

  return {
    status,
    data: {
      regionMatch: binding.regionMatch,
      nearbyLabel: binding.nearbyLabel ?? null,
      region,
    },
    issuedAt: bulletin.issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: bulletin.sourceUrl,
  };
}
