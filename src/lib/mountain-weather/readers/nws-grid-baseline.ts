import { getWeather } from '@/lib/weather';
import { baselineFromWeather, type BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import { cachedSourceRead } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { NWS_GRID_BASELINE_DEF } from '@/lib/mountain-weather/registry';

async function loadBaseline(lat: number, lon: number): Promise<SourceResult<BaselineForecast>> {
  const sourceUrl = `https://api.weather.gov/points/${lat},${lon}`;
  try {
    const weather = await getWeather(lat, lon);
    const data = baselineFromWeather(weather, lat, lon);
    const base: SourceResult<BaselineForecast> = {
      status: 'ok',
      data,
      issuedAt: data.timestamp,
      validFrom: null,
      validTo: null,
      sourceUrl,
    };
    return mergeFreshness(freshnessFromIssued(data.timestamp, NWS_GRID_BASELINE_DEF.expectedEveryHours), base);
  } catch (err) {
    return {
      status: 'error',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const readers = new Map<string, () => Promise<SourceResult<BaselineForecast>>>();

function readerFor(placeId: string, lat: number, lon: number) {
  const key = `${placeId}:${lat.toFixed(4)},${lon.toFixed(4)}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = cachedSourceRead({
      cacheKey: ['nws-grid-baseline', placeId, String(lat), String(lon)],
      def: NWS_GRID_BASELINE_DEF,
      read: () => loadBaseline(lat, lon),
    });
    readers.set(key, reader);
  }
  return reader;
}

/** Shared reader for place pages, conditions, and hub cards — one cached parse per place. */
export async function readNwsGridBaseline(place: {
  id: string;
  lat: number;
  lon: number;
}): Promise<SourceResult<BaselineForecast>> {
  return readerFor(place.id, place.lat, place.lon)();
}
