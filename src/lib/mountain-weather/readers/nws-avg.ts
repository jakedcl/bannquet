import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import { parseAvgBulletin } from '@/lib/mountain-weather/parse/avg';
import type { AvgBulletin, AvgOffice } from '@/lib/mountain-weather/avg-types';
import { NWS_AVG_BTV_DEF, NWS_AVG_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

const DEFS: Record<AvgOffice, SourceDef> = {
  BTV: NWS_AVG_BTV_DEF,
  GYX: NWS_AVG_GYX_DEF,
};

type ProductList = { '@graph'?: { id: string; issuanceTime?: string }[] };
type ProductDoc = { productText?: string; issuanceTime?: string };

async function fetchLatestAvg(office: AvgOffice): Promise<{
  text: string;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
}> {
  const listUrl = `https://api.weather.gov/products/types/AVG/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`AVG list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as ProductList;
  const latest = list['@graph']?.[0];
  if (!latest?.id) throw new Error('No AVG products in feed');
  const productUrl = `https://api.weather.gov/products/${latest.id}`;
  const productRes = await outsideFetch(productUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!productRes.ok) throw new Error(`AVG product HTTP ${productRes.status}`);
  const product = (await productRes.json()) as ProductDoc;
  const text = product.productText ?? '';
  if (!text.trim()) throw new Error('Empty AVG productText');
  const issuanceTime = product.issuanceTime ?? latest.issuanceTime ?? null;
  return { text, issuanceTime, productId: latest.id, sourceUrl: productUrl };
}

async function loadAvgOffice(office: AvgOffice): Promise<SourceResult<AvgBulletin>> {
  const def = DEFS[office];
  try {
    const fetched = await fetchLatestAvg(office);
    const base = buildSourceResult({
      fetched: { ok: true, text: fetched.text, issuedAt: fetched.issuanceTime, sourceUrl: fetched.sourceUrl },
      parse: (text) => parseAvgBulletin(text, fetched.issuanceTime, fetched.productId),
      issuedAt: fetched.issuanceTime,
    });
    if (base.status === 'error' || !base.data) return base;
    let status = base.status;
    if (base.data.seasonalOff) status = 'seasonal-off';
    const merged = mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), { ...base, status });
    return merged;
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
}

const officeReaders = new Map<AvgOffice, () => Promise<SourceResult<AvgBulletin>>>();

function readerForOffice(office: AvgOffice) {
  let reader = officeReaders.get(office);
  if (!reader) {
    const def = DEFS[office];
    reader = cachedSourceRead({
      cacheKey: [def.id, office],
      def,
      read: () => loadAvgOffice(office),
    });
    officeReaders.set(office, reader);
  }
  return reader;
}

export async function readAvgBulletin(office: AvgOffice): Promise<SourceResult<AvgBulletin>> {
  return readerForOffice(office)();
}
