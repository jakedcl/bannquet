import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { MapImageAsset } from '@/lib/mountain-weather/map-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { NWS_RIDGE_NE_MOSAIC_URL, nwsRidgeLoopUrl, radarSiteLabel } from '@/lib/mountain-weather/radar-sites';

export const NWS_RIDGE_NE_MOSAIC_DEF: SourceDef = {
  id: 'nws-ridge-ne-mosaic',
  org: 'National Weather Service',
  kind: 'official',
  terms: 'reuse-ok',
  url: NWS_RIDGE_NE_MOSAIC_URL,
  ttlSeconds: 300,
  expectedEveryHours: 1,
};

function ridgeDef(siteId: string): SourceDef {
  return {
    id: `nws-ridge-${siteId.toLowerCase()}`,
    org: 'National Weather Service',
    kind: 'official',
    terms: 'reuse-ok',
    url: nwsRidgeLoopUrl(siteId),
    ttlSeconds: 300,
    expectedEveryHours: 1,
  };
}

async function loadImage(def: SourceDef, label: string): Promise<SourceResult<MapImageAsset>> {
  const fetched = await fetchSourceBody(def.url);
  return buildSourceResult({
    fetched,
    parse: () => ({
      id: def.id,
      label,
      url: def.url,
      org: 'NWS RIDGE',
      validTimeLabel: fetched.ok ? fetched.issuedAt : null,
    }),
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
}

const readNeMosaicCached = cachedSourceRead({
  cacheKey: [NWS_RIDGE_NE_MOSAIC_DEF.id],
  def: NWS_RIDGE_NE_MOSAIC_DEF,
  read: () => loadImage(NWS_RIDGE_NE_MOSAIC_DEF, 'Northeast radar mosaic loop'),
});

const siteReaders = new Map<string, () => Promise<SourceResult<MapImageAsset>>>();

function readerForSite(siteId: string) {
  let reader = siteReaders.get(siteId);
  if (!reader) {
    const def = ridgeDef(siteId);
    reader = cachedSourceRead({
      cacheKey: [def.id],
      def,
      read: () => loadImage(def, `${radarSiteLabel(siteId)} base reflectivity loop`),
    });
    siteReaders.set(siteId, reader);
  }
  return reader;
}

export async function readNwsRidgeNeMosaic(): Promise<SourceResult<MapImageAsset>> {
  return readNeMosaicCached();
}

export async function readNwsRidgeSiteLoop(siteId: string): Promise<SourceResult<MapImageAsset>> {
  return readerForSite(siteId)();
}