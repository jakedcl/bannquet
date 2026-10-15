import { NextResponse } from 'next/server';
import { MOUNTAIN_GAUGES } from '@/lib/fishing/gauges';
import { waterDataKey } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const HOST = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';
const USER_AGENT = 'Bannquet (admin@bannquet.com)';

type Mode = 'both' | 'header' | 'query';

function keyShape() {
  const raw = process.env.USGS_WATER_DATA_API_KEY ?? process.env.WATER_DATA_API_KEY ?? '';
  const normalized = waterDataKey();
  return {
    present: Boolean(normalized),
    rawLength: raw.length,
    normalizedLength: normalized?.length ?? 0,
    rawHasNewline: /[\r\n]/.test(raw),
    rawHasSpace: /[ \t]/.test(raw),
    rawWrappedQuotes: /^\s*["']/.test(raw),
    normalizedHasWhitespace: Boolean(normalized && /\s/.test(normalized)),
  };
}

async function once(mode: Mode, path: string, params: Record<string, string>) {
  const key = waterDataKey();
  const url = new URL(`${HOST}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('f', 'json');
  url.searchParams.set('limit', '1');
  if ((mode === 'both' || mode === 'query') && key) url.searchParams.set('api_key', key);
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT };
  if ((mode === 'both' || mode === 'header') && key) headers['X-Api-Key'] = key;
  const response = await fetch(url, { headers, cache: 'no-store' });
  let errorCode: string | null = null;
  if (!response.ok) {
    try {
      const body = await response.clone().json() as { error?: { code?: unknown } };
      errorCode = typeof body.error?.code === 'string' && /^[A-Z0-9_]+$/.test(body.error.code) ? body.error.code : null;
    } catch {
      errorCode = null;
    }
  }
  return {
    mode,
    path,
    status: response.status,
    rateLimit: response.headers.get('x-ratelimit-limit'),
    rateRemaining: response.headers.get('x-ratelimit-remaining'),
    errorCode,
  };
}

export async function GET() {
  const shape = keyShape();
  const small = { monitoring_location_id: 'USGS-01435000', parameter_code: '00060', statistic_id: '00011' };
  const attempts = [await once('both', 'latest-continuous/items', small)];
  const first = attempts[0];
  if (first?.status !== 200) {
    attempts.push(await once('header', 'latest-continuous/items', small));
    if (attempts[1]?.status !== 200) attempts.push(await once('query', 'latest-continuous/items', small));
  } else {
    const sites = MOUNTAIN_GAUGES.map((gauge) => `'${gauge.site}'`).join(',');
    attempts.push(await once('both', 'monitoring-locations/items', {
      filter: `agency_code='USGS' AND monitoring_location_number IN (${sites})`,
    }));
  }
  const report = { shape, attempts };
  console.info(JSON.stringify({ tag: 'usgs-probe', ...report }));
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
