import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { MapImageAsset } from '@/lib/mountain-weather/map-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const GOES19_NE_GEOCOLOR_DEF: SourceDef = {
  id: 'goes19-ne-geocolor',
  org: 'NOAA STAR',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/600x600.jpg',
  ttlSeconds: 300,
  expectedEveryHours: 1,
};

export const GOES19_NE_GLM_DEF: SourceDef = {
  id: 'goes19-ne-glm',
  org: 'NOAA STAR',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://cdn.star.nesdis.noaa.gov/GOES19/GLM/SECTOR/ne/EXTENT3/latest.jpg',
  ttlSeconds: 300,
  expectedEveryHours: 1,
};

async function loadStill(def: SourceDef, label: string): Promise<SourceResult<MapImageAsset>> {
  const fetched = await fetchSourceBody(def.url);
  return buildSourceResult({
    fetched,
    parse: () => ({
      id: def.id,
      label,
      url: def.url,
      org: def.org,
      validTimeLabel: fetched.ok ? fetched.issuedAt : 'Image time not in HTTP headers',
    }),
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
}

const readGeocolor = cachedSourceRead({
  cacheKey: [GOES19_NE_GEOCOLOR_DEF.id],
  def: GOES19_NE_GEOCOLOR_DEF,
  read: () => loadStill(GOES19_NE_GEOCOLOR_DEF, 'GOES-19 Northeast GeoColor (ABI)'),
});

const readGlm = cachedSourceRead({
  cacheKey: [GOES19_NE_GLM_DEF.id],
  def: GOES19_NE_GLM_DEF,
  read: () => loadStill(GOES19_NE_GLM_DEF, 'GOES-19 GLM lightning extent (Northeast)'),
});

export async function readGoes19NeGeocolor(): Promise<SourceResult<MapImageAsset>> {
  return readGeocolor();
}

export async function readGoes19NeGlm(): Promise<SourceResult<MapImageAsset>> {
  return readGlm();
}