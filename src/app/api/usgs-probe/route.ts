import { NextResponse } from 'next/server';
import { waterDataKey } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const raw = process.env.USGS_WATER_DATA_API_KEY ?? '';
  const key = waterDataKey();
  const shape = { rawLength: raw.length, accepted: Boolean(key) };
  if (!key) {
    const report = { shape, called: false, status: null, rateLimit: null, rateRemaining: null, errorCode: null };
    console.info(JSON.stringify({ tag: 'usgs-probe', ...report }));
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  }

  const url = new URL('https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items');
  url.searchParams.set('monitoring_location_id', 'USGS-01435000');
  url.searchParams.set('parameter_code', '00060');
  url.searchParams.set('statistic_id', '00011');
  url.searchParams.set('f', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('api_key', key);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Bannquet (admin@bannquet.com)',
      'X-Api-Key': key,
    },
    cache: 'no-store',
  });
  let errorCode: string | null = null;
  if (!response.ok) {
    try {
      const body = await response.clone().json() as { error?: { code?: unknown } };
      errorCode = typeof body.error?.code === 'string' && /^[A-Z0-9_]+$/.test(body.error.code) ? body.error.code : null;
    } catch {
      errorCode = null;
    }
  }
  const report = {
    shape,
    called: true,
    status: response.status,
    rateLimit: response.headers.get('x-ratelimit-limit'),
    rateRemaining: response.headers.get('x-ratelimit-remaining'),
    errorCode,
  };
  console.info(JSON.stringify({ tag: 'usgs-probe', ...report }));
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
