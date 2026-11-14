import { cachedSourceRead, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { SpcOutlookImage } from '@/lib/mountain-weather/map-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const SPC_CONVECTIVE_OUTLOOK_DEF: SourceDef = {
  id: 'spc-convective-outlook',
  org: 'Storm Prediction Center',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://www.spc.noaa.gov/products/outlook/day1otlk.html',
  ttlSeconds: 900,
  expectedEveryHours: 1,
};

const SPC_BASE = 'https://www.spc.noaa.gov/products/outlook/';
const DAYS = [
  { id: 'spc-day1', day: 1, page: 'day1otlk.html', prefix: 'day1' },
  { id: 'spc-day2', day: 2, page: 'day2otlk.html', prefix: 'day2' },
  { id: 'spc-day3', day: 3, page: 'day3otlk.html', prefix: 'day3' },
] as const;

function parseIssuedUtc(html: string): string | null {
  const m = html.match(/Updated:&nbsp;([^<]+UTC\s+\d{4})/);
  return m ? m[1].trim() : null;
}

export function parseSpcCycleToken(html: string, prefix: string): string | null {
  const archive = html.match(new RegExp(`${prefix}otlk_\\d{8}_(\\d{4})-geojson`, 'i'));
  if (archive) return archive[1];
  const legacy = html.match(new RegExp(`${prefix}otlk_(\\d{4})\\.html`, 'i'));
  return legacy ? legacy[1] : null;
}

async function verifyUrl(url: string): Promise<boolean> {
  const fetched = await fetchSourceBody(url);
  return fetched.ok;
}

async function loadDay(entry: (typeof DAYS)[number]): Promise<SpcOutlookImage | null> {
  const pageUrl = `${SPC_BASE}${entry.page}`;
  const page = await fetchSourceBody(pageUrl);
  if (!page.ok) return null;
  const cycle = parseSpcCycleToken(page.text, entry.prefix);
  if (!cycle) return null;
  const imagePath = `${entry.prefix}otlk_${cycle}.png`;
  const imageUrl = `${SPC_BASE}${imagePath}`;
  const httpOk = await verifyUrl(imageUrl);
  const issued = parseIssuedUtc(page.text);
  return {
    id: entry.id,
    label: `SPC Day ${entry.day} categorical outlook (${cycle}Z)`,
    url: imageUrl,
    org: 'SPC',
    validTimeLabel: issued ?? `${cycle}Z cycle`,
    pageUrl,
    httpOk,
  };
}

async function loadAll(): Promise<SourceResult<SpcOutlookImage[]>> {
  const images = (await Promise.all(DAYS.map((d) => loadDay(d)))).filter((row): row is SpcOutlookImage => row !== null);
  const issuedAt = images[0]?.validTimeLabel ?? null;
  return {
    status: images.length ? 'ok' : 'error',
    data: images,
    issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: SPC_CONVECTIVE_OUTLOOK_DEF.url,
    error: images.length ? undefined : 'SPC outlook pages did not yield image URLs',
  };
}

const readCached = cachedSourceRead({
  cacheKey: [SPC_CONVECTIVE_OUTLOOK_DEF.id],
  def: SPC_CONVECTIVE_OUTLOOK_DEF,
  read: loadAll,
});

export async function readSpcConvectiveOutlookImages(): Promise<SourceResult<SpcOutlookImage[]>> {
  return readCached();
}