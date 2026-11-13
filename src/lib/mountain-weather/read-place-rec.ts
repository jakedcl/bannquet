import type { AllLocationsPlaceSlice } from '@/lib/mountain-weather/all-locations-types';
import type { RecOffice, RecPlaceSlice } from '@/lib/mountain-weather/rec-types';
import { pickRecSection } from '@/lib/mountain-weather/parse/rec';
import { readAllLocationsIndex } from '@/lib/mountain-weather/readers/nws-all-locations';
import { readRecBulletin } from '@/lib/mountain-weather/readers/nws-rec';
import {
  sourceBindingForPlace,
  type AllLocationsPlaceBinding,
  type RecPlaceBinding,
} from '@/lib/mountain-weather/source-bindings';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function asList<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function readRecForPlace(placeId: string): Promise<SourceResult<RecPlaceSlice>[] | null> {
  const list = asList(sourceBindingForPlace(placeId)?.rec);
  if (list.length === 0) return null;

  const byOffice = new Map<RecOffice, RecPlaceBinding[]>();
  for (const b of list) {
    const bucket = byOffice.get(b.office) ?? [];
    bucket.push(b);
    byOffice.set(b.office, bucket);
  }

  const out: SourceResult<RecPlaceSlice>[] = [];

  for (const [office, binds] of byOffice) {
    const bulletin = await readRecBulletin(office);
    if (bulletin.status === 'error' || !bulletin.data) {
      for (const _bind of binds) {
        out.push({ ...bulletin, data: null });
      }
      continue;
    }

    for (const binding of binds) {
      const section = pickRecSection(bulletin.data, binding.sectionMatch);
      if (!section) {
        out.push({
          status: 'error',
          data: null,
          issuedAt: bulletin.issuedAt,
          validFrom: null,
          validTo: null,
          sourceUrl: bulletin.sourceUrl,
          error: `No REC section matching “${binding.sectionMatch}”`,
        });
        continue;
      }

      out.push({
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
      });
    }
  }

  return out;
}

export async function readAllLocationsForPlace(
  placeId: string,
): Promise<SourceResult<AllLocationsPlaceSlice>[] | null> {
  const list = asList(sourceBindingForPlace(placeId)?.allLocations);
  if (list.length === 0) return null;

  const byOffice = new Map<AllLocationsPlaceBinding['office'], AllLocationsPlaceBinding[]>();
  for (const b of list) {
    const bucket = byOffice.get(b.office) ?? [];
    bucket.push(b);
    byOffice.set(b.office, bucket);
  }

  const out: SourceResult<AllLocationsPlaceSlice>[] = [];

  for (const [office, binds] of byOffice) {
    const file = await readAllLocationsIndex(office);
    if (file.status === 'error' || !file.data) {
      for (const _bind of binds) {
        out.push({ ...file, data: null });
      }
      continue;
    }

    for (const binding of binds) {
      const marker = file.data[binding.loc] ?? null;
      if (!marker) {
        out.push({
          status: 'error',
          data: null,
          issuedAt: file.issuedAt,
          validFrom: null,
          validTo: null,
          sourceUrl: file.sourceUrl,
          error: `No allLocations marker for ${binding.loc}`,
        });
        continue;
      }

      const status = marker.seasonalOff ? 'seasonal-off' : file.status;

      out.push({
        status,
        data: {
          office: binding.office,
          loc: binding.loc,
          bandLabel: binding.bandLabel ?? null,
          marker,
        },
        issuedAt: file.issuedAt,
        validFrom: null,
        validTo: null,
        sourceUrl: file.sourceUrl,
      });
    }
  }

  return out;
}
