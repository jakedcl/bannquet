import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { FzlBulletin, FzlOffice } from '@/lib/mountain-weather/fzl-types';
import { parseFzlProduct } from '@/lib/mountain-weather/parse/fzl';
import { NWS_FZL_ALY_DEF, NWS_FZL_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

const DEFS: Record<FzlOffice, SourceDef> = {
  ALY: NWS_FZL_ALY_DEF,
  GYX: NWS_FZL_GYX_DEF,
};

type ProductList = { '@graph'?: { id: string; issuanceTime?: string }[] };
type ProductDoc = { productText?: string; issuanceTime?: string };

async function fetchLatestFzl(office: FzlOffice): Promise<{
  text: string;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
}> {
  const listUrl = `https://api.weather.gov/products/types/FZL/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`FZL list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as ProductList;
  const latest = list['@graph']?.[0];
  if (!latest?.id) throw new Error(`No FZL products for ${office}`);
  const productUrl = `https://api.weather.gov/products/${latest.id}`;
  const productRes = await outsideFetch(productUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!productRes.ok) throw new Error(`FZL product HTTP ${productRes.status}`);
  const product = (await productRes.json()) as ProductDoc;
  const text = product.productText ?? '';
  if (!text.trim()) throw new Error('Empty FZL productText');
  const issuanceTime = product.issuanceTime ?? latest.issuanceTime ?? null;
  return { text, issuanceTime, productId: latest.id, sourceUrl: productUrl };
}

async function loadFzl(office: FzlOffice): Promise<SourceResult<FzlBulletin>> {
  const def = DEFS[office];
  try {
    const fetched = await fetchLatestFzl(office);
    const base = buildSourceResult({
      fetched: { ok: true, text: fetched.text, issuedAt: fetched.issuanceTime, sourceUrl: fetched.sourceUrl },
      parse: (text) => parseFzlProduct(text, office, fetched.productId, fetched.issuanceTime),
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

const officeReaders = new Map<FzlOffice, () => Promise<SourceResult<FzlBulletin>>>();

function readerForOffice(office: FzlOffice) {
  let reader = officeReaders.get(office);
  if (!reader) {
    const def = DEFS[office];
    reader = cachedSourceRead({
      cacheKey: [def.id, office],
      def,
      read: () => loadFzl(office),
    });
    officeReaders.set(office, reader);
  }
  return reader;
}

export async function readFzlBulletin(office: FzlOffice): Promise<SourceResult<FzlBulletin>> {
  return readerForOffice(office)();
}