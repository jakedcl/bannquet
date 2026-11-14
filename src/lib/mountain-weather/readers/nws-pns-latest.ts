import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import { parsePnsSnowReports } from '@/lib/mountain-weather/parse/pns';
import type { StormReportProduct } from '@/lib/mountain-weather/snow-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

function pnsDef(office: MountainWfo): SourceDef {
  return {
    id: `nws-${office.toLowerCase()}-pns`,
    org: `National Weather Service ${office}`,
    kind: 'measured',
    terms: 'reuse-ok',
    url: `https://api.weather.gov/products/types/PNS/locations/${office}/latest`,
    ttlSeconds: 1800,
    expectedEveryHours: 12,
    season: 'winter',
  };
}

async function fetchLatestPns(office: MountainWfo): Promise<{
  text: string;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
}> {
  const listUrl = `https://api.weather.gov/products/types/PNS/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`PNS list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as { '@graph'?: { id: string; issuanceTime?: string }[] };
  const latest = list['@graph']?.[0];
  const direct = await outsideFetch(pnsDef(office).url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (direct.ok) {
    const doc = (await direct.json()) as { productText?: string; issuanceTime?: string; id?: string };
    if (doc.productText?.trim()) {
      return {
        text: doc.productText,
        issuanceTime: doc.issuanceTime ?? null,
        productId: doc.id ?? latest?.id ?? null,
        sourceUrl: pnsDef(office).url,
      };
    }
  }
  if (!latest?.id) throw new Error(`No PNS for ${office}`);
  const productUrl = `https://api.weather.gov/products/${latest.id}`;
  const productRes = await outsideFetch(productUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!productRes.ok) throw new Error(`PNS product HTTP ${productRes.status}`);
  const product = (await productRes.json()) as { productText?: string; issuanceTime?: string };
  const text = product.productText ?? '';
  if (!text.trim()) throw new Error('Empty PNS');
  return {
    text,
    issuanceTime: product.issuanceTime ?? latest.issuanceTime ?? null,
    productId: latest.id,
    sourceUrl: productUrl,
  };
}

const readerCache = new Map<MountainWfo, () => Promise<SourceResult<StormReportProduct>>>();

export function readNwsPnsLatest(office: MountainWfo): Promise<SourceResult<StormReportProduct>> {
  let reader = readerCache.get(office);
  if (!reader) {
    const def = pnsDef(office);
    const load = async (): Promise<SourceResult<StormReportProduct>> => {
      try {
        const fetched = await fetchLatestPns(office);
        return buildSourceResult({
          fetched: {
            ok: true,
            text: fetched.text,
            issuedAt: fetched.issuanceTime,
            sourceUrl: fetched.sourceUrl,
          },
          parse: (text) => parsePnsSnowReports(text, office, fetched.productId, fetched.issuanceTime),
          issuedAt: fetched.issuanceTime,
        });
      } catch (err) {
        return {
          status: 'error',
          data: null,
          issuedAt: null,
          validFrom: null,
          validTo: null,
          sourceUrl: def.url,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    };
    reader = cachedSourceRead({ cacheKey: [def.id], def, read: load });
    readerCache.set(office, reader);
  }
  return reader();
}

export function nwsPnsSourceDef(office: MountainWfo): SourceDef {
  return pnsDef(office);
}