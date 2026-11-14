import type { AvalancheCenterId, AvalancheProductBundle } from '@/lib/mountain-weather/avalanche-types';
import { avalancheBindingForPlace } from '@/lib/mountain-weather/avalanche-bindings';
import type { AvgPlaceSlice } from '@/lib/mountain-weather/avg-types';
import { readAvgForPlace } from '@/lib/mountain-weather/read-place-avg';
import { readAvalancheMapLayerMwac } from '@/lib/mountain-weather/readers/avalanche-map-layer-mwac';
import { readAvalancheMapLayerNysac } from '@/lib/mountain-weather/readers/avalanche-map-layer-nysac';
import { readAvalancheProduct } from '@/lib/mountain-weather/readers/avalanche-product';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export type PlaceAvalancheData = {
  binding: { centers: AvalancheCenterId[]; bindReason: string };
  centers: SourceResult<AvalancheProductBundle>[];
  avg: SourceResult<AvgPlaceSlice>[] | null;
};

async function readCenter(centerId: AvalancheCenterId): Promise<SourceResult<AvalancheProductBundle>> {
  const layer =
    centerId === 'MWAC' ? await readAvalancheMapLayerMwac() : await readAvalancheMapLayerNysac();
  if (layer.status === 'error' || !layer.data || layer.data.length === 0) {
    return {
      status: 'error',
      data: null,
      issuedAt: layer.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: layer.sourceUrl,
      error: layer.error ?? `No ${centerId} map-layer feature`,
    };
  }
  const feature = layer.data[0];
  return readAvalancheProduct(feature);
}

export async function readPlaceAvalanche(placeId: string): Promise<PlaceAvalancheData | null> {
  const binding = avalancheBindingForPlace(placeId);
  if (!binding) return null;
  const centers = await Promise.all(binding.centers.map((c) => readCenter(c)));
  const avg = await readAvgForPlace(placeId);
  const hasAvg = avg && avg.length > 0;
  const hasCenter = centers.some((c) => c.data || c.status === 'seasonal-off');
  if (!hasAvg && !hasCenter) return null;
  return { binding, centers, avg };
}

export async function readAvalancheHub(): Promise<{
  mwac: SourceResult<AvalancheProductBundle>;
  nysac: SourceResult<AvalancheProductBundle>;
}> {
  const [mwac, nysac] = await Promise.all([readCenter('MWAC'), readCenter('NYSAC')]);
  return { mwac, nysac };
}