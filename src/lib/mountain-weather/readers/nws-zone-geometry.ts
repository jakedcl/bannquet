import fs from 'node:fs';
import path from 'node:path';
import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const NWS_ZONE_GEOJSON_DEF: SourceDef = {
  id: 'nws-zone-geojson',
  org: 'National Weather Service',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/zones/forecast/{zoneId}',
  ttlSeconds: 86_400,
  expectedEveryHours: 24 * 30,
};

const cachePath = path.join(process.cwd(), 'config/mountain-weather/nws-zone-geometry-cache.json');

type CacheFile = Record<string, GeoJSON.Polygon | GeoJSON.MultiPolygon | null>;

function loadCache(): CacheFile {
  try {
    if (!fs.existsSync(cachePath)) return {};
    return JSON.parse(fs.readFileSync(cachePath, 'utf8')) as CacheFile;
  } catch {
    return {};
  }
}

function saveCache(cache: CacheFile) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  } catch {
    /* ignore on read-only */
  }
}

const zoneReaders = new Map<string, () => Promise<SourceResult<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>>>();

function zoneDef(zoneId: string): SourceDef {
  return {
    ...NWS_ZONE_GEOJSON_DEF,
    id: `nws-zone-${zoneId.toLowerCase()}`,
    url: `https://api.weather.gov/zones/forecast/${zoneId}`,
  };
}

function readerForZone(zoneId: string) {
  let reader = zoneReaders.get(zoneId);
  if (!reader) {
    reader = cachedSourceRead({
      cacheKey: ['nws-zone', zoneId],
      def: zoneDef(zoneId),
      read: async () => {
        const disk = loadCache();
        if (disk[zoneId] !== undefined) {
          return {
            status: 'ok',
            data: disk[zoneId],
            issuedAt: null,
            validFrom: null,
            validTo: null,
            sourceUrl: zoneDef(zoneId).url,
          };
        }
        const fetched = await fetchSourceBody(zoneDef(zoneId).url);
        const result = buildSourceResult({
          fetched,
          parse: (text) => {
            const body = JSON.parse(text) as { geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null };
            return body.geometry ?? null;
          },
        });
        if (result.status === 'ok') {
          const cache = loadCache();
          cache[zoneId] = result.data;
          saveCache(cache);
        }
        return result;
      },
    });
    zoneReaders.set(zoneId, reader);
  }
  return reader;
}

export async function readNwsZoneGeometry(
  zoneId: string,
): Promise<SourceResult<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>> {
  return readerForZone(zoneId)();
}

export function polygonsFromGeometry(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.Polygon[] {
  if (geometry.type === 'Polygon') return [geometry];
  return geometry.coordinates.map((coords) => ({ type: 'Polygon', coordinates: coords }));
}