import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { AvalancheMapLayerFeature, AvalancheProductBundle } from '@/lib/mountain-weather/avalanche-types';
import { parseAvalancheProduct } from '@/lib/mountain-weather/parse/avalanche';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

function productDef(productId: number, centerId: string): SourceDef {
  return {
    id: `avalanche-product-${centerId.toLowerCase()}-${productId}`,
    org: centerId === 'MWAC' ? 'Mount Washington Avalanche Center' : 'NY DEC',
    kind: 'official',
    terms: 'reuse-ok',
    url: `https://api.avalanche.org/v2/public/product/${productId}`,
    ttlSeconds: 1800,
    expectedEveryHours: 12,
    season: 'winter',
  };
}

const readerCache = new Map<string, () => Promise<SourceResult<AvalancheProductBundle>>>();

function bundleFromMapLayerOnly(mapLayer: AvalancheMapLayerFeature): AvalancheProductBundle {
  return parseAvalancheProduct('{}', mapLayer);
}

async function loadProduct(mapLayer: AvalancheMapLayerFeature): Promise<SourceResult<AvalancheProductBundle>> {
  const def = productDef(mapLayer.productId, mapLayer.centerId);
  const url = def.url;
  if (mapLayer.offSeason) {
    const data = bundleFromMapLayerOnly(mapLayer);
    return {
      status: 'seasonal-off',
      data,
      issuedAt: data.lastKnownIssued,
      validFrom: mapLayer.startDate,
      validTo: mapLayer.endDate,
      sourceUrl: url,
    };
  }
  const fetched = await fetchSourceBody(url);
  const base = buildSourceResult({
    fetched,
    parse: (text) => parseAvalancheProduct(text, mapLayer),
    issuedAt: undefined,
  });
  if (base.status === 'error' || !base.data) return base;
  const parsed = base.data;
  if (parsed.offSeason || (!parsed.publishedTime && parsed.dangerBands.length === 0)) {
    const seasonal = bundleFromMapLayerOnly(mapLayer);
    return {
      status: 'seasonal-off',
      data: { ...seasonal, ...parsed, offSeason: true, lastKnownIssued: seasonal.lastKnownIssued },
      issuedAt: seasonal.lastKnownIssued,
      validFrom: mapLayer.startDate,
      validTo: mapLayer.endDate,
      sourceUrl: url,
    };
  }
  const expires = parsed.expiresTime ? Date.parse(parsed.expiresTime) : NaN;
  if (Number.isFinite(expires) && expires < Date.now()) {
    return {
      status: 'stale',
      data: parsed,
      issuedAt: parsed.publishedTime,
      validFrom: parsed.publishedTime,
      validTo: parsed.expiresTime,
      sourceUrl: url,
      error: 'Forecast expired',
    };
  }
  return mergeFreshness(freshnessFromIssued(parsed.publishedTime, def.expectedEveryHours), {
    ...base,
    data: parsed,
    issuedAt: parsed.publishedTime,
    validFrom: parsed.publishedTime,
    validTo: parsed.expiresTime,
  });
}

export function readAvalancheProduct(
  mapLayer: AvalancheMapLayerFeature,
): Promise<SourceResult<AvalancheProductBundle>> {
  const key = `${mapLayer.centerId}:${mapLayer.productId}`;
  let reader = readerCache.get(key);
  if (!reader) {
    const def = productDef(mapLayer.productId, mapLayer.centerId);
    const load = () => loadProduct(mapLayer);
    reader = cachedSourceRead({
      cacheKey: [def.id],
      def,
      read: load,
    });
    readerCache.set(key, reader);
  }
  return reader();
}

export function avalancheProductSourceDef(mapLayer: AvalancheMapLayerFeature): SourceDef {
  return productDef(mapLayer.productId, mapLayer.centerId);
}