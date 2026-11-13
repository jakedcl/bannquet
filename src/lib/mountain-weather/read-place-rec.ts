import type { AllLocationsPlaceSlice } from '@/lib/mountain-weather/all-locations-types';
import type { RecPlaceSlice } from '@/lib/mountain-weather/rec-types';
import { pickRecSection } from '@/lib/mountain-weather/parse/rec';
import { readAllLocationsIndex } from '@/lib/mountain-weather/readers/nws-all-locations';
import { readRecBulletin } from '@/lib/mountain-weather/readers/nws-rec';
import { sourceBindingForPlace } from '@/lib/mountain-weather/source-bindings';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export async function readRecForPlace(placeId: string): Promise<SourceResult<RecPlaceSlice> | null> {
  const binding = sourceBindingForPlace(placeId)?.rec;
  if (!binding) return null;

  const bulletin = await readRecBulletin(binding.office);
  if (bulletin.status === 'error' || !bulletin.data) {
    return { ...bulletin, data: null };
  }

  const section = pickRecSection(bulletin.data, binding.sectionMatch);
  if (!section) {
    return {
      status: 'error',
      data: null,
      issuedAt: bulletin.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bulletin.sourceUrl,
      error: `No REC section matching “${binding.sectionMatch}”`,
    };
  }

  return {
    status: bulletin.status,
    data: {
      office: binding.office,
      sectionMatch: binding.sectionMatch,
      nearbyLabel: binding.nearbyLabel ?? null,
      section,
      issuanceTime: bulletin.data.issuanceTime,
      productId: bulletin.data.productId,
    },
    issuedAt: bulletin.issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: bulletin.sourceUrl,
  };
}

export async function readAllLocationsForPlace(
  placeId: string,
): Promise<SourceResult<AllLocationsPlaceSlice> | null> {
  const binding = sourceBindingForPlace(placeId)?.allLocations;
  if (!binding) return null;

  const file = await readAllLocationsIndex(binding.office);
  if (file.status === 'error' || !file.data) {
    return { ...file, data: null };
  }

  const marker = file.data[binding.loc] ?? null;
  if (!marker) {
    return {
      status: 'error',
      data: null,
      issuedAt: file.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: file.sourceUrl,
      error: `No allLocations marker for ${binding.loc}`,
    };
  }

  const status = marker.seasonalOff ? 'seasonal-off' : file.status;

  return {
    status,
    data: {
      office: binding.office,
      loc: binding.loc,
      marker,
    },
    issuedAt: file.issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: file.sourceUrl,
  };
}
