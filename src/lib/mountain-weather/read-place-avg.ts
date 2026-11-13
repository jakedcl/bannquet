import type { AvgOffice, AvgPlaceSlice } from '@/lib/mountain-weather/avg-types';
import { pickAvgPoint } from '@/lib/mountain-weather/parse/avg';
import { readAvgBulletin } from '@/lib/mountain-weather/readers/nws-avg';
import { sourceBindingForPlace, type AvgPlaceBinding } from '@/lib/mountain-weather/source-bindings';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function bindingsList(raw: AvgPlaceBinding | AvgPlaceBinding[] | undefined): AvgPlaceBinding[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function readAvgForPlace(placeId: string): Promise<SourceResult<AvgPlaceSlice>[] | null> {
  const list = bindingsList(sourceBindingForPlace(placeId)?.avg);
  if (list.length === 0) return null;

  const byOffice = new Map<AvgOffice, AvgPlaceBinding[]>();
  for (const b of list) {
    const bucket = byOffice.get(b.office) ?? [];
    bucket.push(b);
    byOffice.set(b.office, bucket);
  }

  const out: SourceResult<AvgPlaceSlice>[] = [];

  for (const [office, binds] of byOffice) {
    const bulletin = await readAvgBulletin(office);
    if (bulletin.status === 'seasonal-off' || (bulletin.data?.seasonalOff && bulletin.data.points.length === 0)) {
      for (const binding of binds) {
        out.push({
          status: 'seasonal-off',
          data: {
            office: binding.office,
            pointMatch: binding.pointMatch,
            nearbyLabel: binding.nearbyLabel ?? null,
            elevationNote: binding.elevationNote ?? null,
            point: {
              title: binding.pointMatch,
              elevationFt: null,
              searchKey: binding.pointMatch.toUpperCase(),
              grids: [],
            },
            issuanceTime: bulletin.data?.issuanceTime ?? bulletin.issuedAt,
            productId: bulletin.data?.productId ?? null,
            seasonalMessage: bulletin.data?.seasonalMessage ?? null,
          },
          issuedAt: bulletin.issuedAt,
          validFrom: null,
          validTo: null,
          sourceUrl: bulletin.sourceUrl,
        });
      }
      continue;
    }

    if (bulletin.status === 'error' || !bulletin.data) {
      for (const _bind of binds) {
        out.push({ ...bulletin, data: null, error: bulletin.error ?? 'AVG bulletin unavailable' });
      }
      continue;
    }

    for (const binding of binds) {
      const point = pickAvgPoint(bulletin.data, binding.pointMatch);
      if (!point) {
        out.push({
          status: 'error',
          data: null,
          issuedAt: bulletin.issuedAt,
          validFrom: null,
          validTo: null,
          sourceUrl: bulletin.sourceUrl,
          error: `No AVG point matching “${binding.pointMatch}”`,
        });
        continue;
      }
      out.push({
        status: bulletin.status,
        data: {
          office: binding.office,
          pointMatch: binding.pointMatch,
          nearbyLabel: binding.nearbyLabel ?? null,
          elevationNote: binding.elevationNote ?? null,
          point,
          issuanceTime: bulletin.data.issuanceTime,
          productId: bulletin.data.productId,
          seasonalMessage: null,
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
