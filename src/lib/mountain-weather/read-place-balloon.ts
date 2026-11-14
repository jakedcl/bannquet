import type { BalloonPlaceSlice } from '@/lib/mountain-weather/balloon-types';
import { pickBalloonRegionFromMatches } from '@/lib/mountain-weather/parse/balloon';
import { readBtvBalloonForecast } from '@/lib/mountain-weather/readers/nws-btv-balloon';
import { NWS_BTV_BALLOON_DEF } from '@/lib/mountain-weather/registry';
import { sourceBindingForPlace } from '@/lib/mountain-weather/source-bindings';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function regionMatches(binding: NonNullable<ReturnType<typeof sourceBindingForPlace>>['balloon']) {
  if (!binding) return [];
  if (binding.regionMatches?.length) return binding.regionMatches;
  return [binding.regionMatch];
}

export async function readBalloonForPlace(placeId: string): Promise<SourceResult<BalloonPlaceSlice> | null> {
  const binding = sourceBindingForPlace(placeId)?.balloon;
  if (!binding) return null;

  const needles = regionMatches(binding);
  const bulletin = await readBtvBalloonForecast();
  if (bulletin.status === 'error') {
    return { ...bulletin, data: null };
  }

  if (!bulletin.data || bulletin.data.regions.length === 0) {
    return {
      status: 'not-in-issuance',
      data: null,
      issuedAt: bulletin.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bulletin.sourceUrl ?? NWS_BTV_BALLOON_DEF.url,
    };
  }

  const hit = pickBalloonRegionFromMatches(bulletin.data, needles);
  if (!hit) {
    return {
      status: 'not-in-issuance',
      data: null,
      issuedAt: bulletin.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bulletin.sourceUrl ?? NWS_BTV_BALLOON_DEF.url,
    };
  }

  const status = hit.region.seasonalOff ? 'seasonal-off' : bulletin.status;

  return {
    status,
    data: {
      regionMatch: binding.regionMatch,
      nearbyLabel: binding.nearbyLabel ?? null,
      region: hit.region,
      matchedRegionTitle: hit.matched,
    },
    issuedAt: bulletin.issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: bulletin.sourceUrl,
  };
}