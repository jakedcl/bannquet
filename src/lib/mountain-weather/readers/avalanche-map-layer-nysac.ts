import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { AvalancheCenterId, AvalancheMapLayerFeature } from '@/lib/mountain-weather/avalanche-types';
import { parseAvalancheMapLayer } from '@/lib/mountain-weather/parse/avalanche';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const AVALANCHE_MAP_LAYER_NYSAC_DEF: SourceDef = {
  id: 'avalanche-map-layer-nysac',
  org: 'NY DEC',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://api.avalanche.org/v2/public/products/map-layer/NYSAC',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
  season: 'winter',
};

async function load(): Promise<SourceResult<AvalancheMapLayerFeature[]>> {
  const url = AVALANCHE_MAP_LAYER_NYSAC_DEF.url;
  const fetched = await fetchSourceBody(url);
  return buildSourceResult({
    fetched,
    parse: (text) => parseAvalancheMapLayer(text, 'NYSAC' as AvalancheCenterId),
  });
}

const readCached = cachedSourceRead({
  cacheKey: [AVALANCHE_MAP_LAYER_NYSAC_DEF.id],
  def: AVALANCHE_MAP_LAYER_NYSAC_DEF,
  read: load,
});

export function readAvalancheMapLayerNysac(): Promise<SourceResult<AvalancheMapLayerFeature[]>> {
  return readCached();
}