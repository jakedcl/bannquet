import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseUsnoRsttDay } from '@/lib/mountain-weather/parse/usno-rstt';
import type { UsnoDaySky } from '@/lib/mountain-weather/sky-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const USNO_RSTT_ONEDAY_DEF: SourceDef = {
  id: 'usno-rstt-oneday',
  org: 'US Naval Observatory',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://aa.usno.navy.mil/api/rstt/oneday',
  ttlSeconds: 43_200,
  expectedEveryHours: 24,
};

const ET_OFFSET = -5;

const readers = new Map<string, () => Promise<SourceResult<UsnoDaySky>>>();

function urlFor(date: string, lat: number, lon: number) {
  return `${USNO_RSTT_ONEDAY_DEF.url}?date=${date}&coords=${lat},${lon}&tz=${ET_OFFSET}&dst=true`;
}

function readerFor(date: string, lat: number, lon: number) {
  const key = `${date}:${lat.toFixed(4)},${lon.toFixed(4)}`;
  let reader = readers.get(key);
  if (!reader) {
    const sourceUrl = urlFor(date, lat, lon);
    reader = cachedSourceRead({
      cacheKey: ['usno-rstt', date, String(lat), String(lon)],
      def: USNO_RSTT_ONEDAY_DEF,
      read: async () =>
        buildSourceResult({
          fetched: await fetchSourceBody(sourceUrl),
          parse: (text) => parseUsnoRsttDay(date, sourceUrl, JSON.parse(text)),
        }),
    });
    readers.set(key, reader);
  }
  return reader;
}

export async function readUsnoRsttOneDay(date: string, lat: number, lon: number): Promise<SourceResult<UsnoDaySky>> {
  return readerFor(date, lat, lon)();
}