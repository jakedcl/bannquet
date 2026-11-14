import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import { parseRecBulletin } from '@/lib/mountain-weather/parse/rec';
import type { RecBulletin, RecOffice } from '@/lib/mountain-weather/rec-types';
import { NWS_REC_ALY_DEF, NWS_REC_BTV_DEF, NWS_REC_CAR_DEF, NWS_REC_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

const CORE_DEFS: Record<'BTV' | 'ALY' | 'GYX' | 'CAR', SourceDef> = {
  BTV: NWS_REC_BTV_DEF,
  ALY: NWS_REC_ALY_DEF,
  GYX: NWS_REC_GYX_DEF,
  CAR: NWS_REC_CAR_DEF,
};

function recDef(office: RecOffice): SourceDef {
  if (office in CORE_DEFS) return CORE_DEFS[office as keyof typeof CORE_DEFS];
  return {
    id: `nws-${office.toLowerCase()}-rec`,
    org: `National Weather Service ${office}`,
    kind: 'forecast',
    terms: 'reuse-ok',
    url: `https://api.weather.gov/products/types/REC/locations/${office}`,
    ttlSeconds: 1800,
    expectedEveryHours: 6,
  };
}

type ProductList = { '@graph'?: { id: string; issuanceTime?: string }[] };
type ProductDoc = { productText?: string; issuanceTime?: string };

async function fetchLatestRec(office: RecOffice): Promise<{
  text: string;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
}> {
  const listUrl = `https://api.weather.gov/products/types/REC/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`REC list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as ProductList;
  const latest = list['@graph']?.[0];
  if (!latest?.id) throw new Error('No REC products in feed');
  const productUrl = `https://api.weather.gov/products/${latest.id}`;
  const productRes = await outsideFetch(productUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!productRes.ok) throw new Error(`REC product HTTP ${productRes.status}`);
  const product = (await productRes.json()) as ProductDoc;
  const text = product.productText ?? '';
  if (!text.trim()) throw new Error('Empty REC productText');
  const issuanceTime = product.issuanceTime ?? latest.issuanceTime ?? null;
  return { text, issuanceTime, productId: latest.id, sourceUrl: productUrl };
}

async function loadRecOffice(office: RecOffice): Promise<SourceResult<RecBulletin>> {
  const def = recDef(office);
  try {
    const fetched = await fetchLatestRec(office);
    const base = buildSourceResult({
      fetched: { ok: true, text: fetched.text, issuedAt: fetched.issuanceTime, sourceUrl: fetched.sourceUrl },
      parse: (text) => parseRecBulletin(text, fetched.issuanceTime, fetched.productId),
      issuedAt: fetched.issuanceTime,
    });
    if (base.status === 'error' || !base.data) return base;
    return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
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

const officeReaders = new Map<RecOffice, () => Promise<SourceResult<RecBulletin>>>();

function readerForOffice(office: RecOffice) {
  let reader = officeReaders.get(office);
  if (!reader) {
    const def = recDef(office);
    reader = cachedSourceRead({
      cacheKey: [def.id, office],
      def,
      read: () => loadRecOffice(office),
    });
    officeReaders.set(office, reader);
  }
  return reader;
}

export async function readRecBulletin(office: RecOffice): Promise<SourceResult<RecBulletin>> {
  return readerForOffice(office)();
}