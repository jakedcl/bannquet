import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { AvalancheCenterId, AvalancheMapLayerFeature } from '@/lib/mountain-weather/avalanche-types';
import { parseAvalancheMapLayer } from '@/lib/mountain-weather/parse/avalanche';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const AVALANCHE_MAP_LAYER_MWAC_DEF: SourceDef = {
  id: 'avalanche-map-layer-mwac',
  org: 'Mount Washington Avalanche Center',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://api.avalanche.org/v2/public/products/map-layer/MWAC',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
  season: 'winter',
};

async function load(): Promise<SourceResult<AvalancheMapLayerFeature[]>> {
  const url = AVALANCHE_MAP_LAYER_MWAC_DEF.url;
  const fetched = await fetchSourceBody(url);
  return buildSourceResult({
    fetched,
    parse: (text) => parseAvalancheMapLayer(text, 'MWAC' as AvalancheCenterId),
  });
}

const readCached = cachedSourceRead({
  cacheKey: [AVALANCHE_MAP_LAYER_MWAC_DEF.id],
  def: AVALANCHE_MAP_LAYER_MWAC_DEF,
  read: load,
});

export function readAvalancheMapLayerMwac(): Promise<SourceResult<AvalancheMapLayerFeature[]>> {
  return readCached();
}