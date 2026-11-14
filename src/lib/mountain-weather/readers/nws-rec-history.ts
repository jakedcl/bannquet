import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { parseRecBulletin } from '@/lib/mountain-weather/parse/rec';
import type { RecBulletin, RecOffice } from '@/lib/mountain-weather/rec-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

export type RecBulletinEntry = {
  bulletin: RecBulletin;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
};

type ProductList = { '@graph'?: { id: string; issuanceTime?: string }[] };
type ProductDoc = { productText?: string; issuanceTime?: string };

async function fetchRecProductList(office: RecOffice): Promise<{ id: string; issuanceTime?: string }[]> {
  const listUrl = `https://api.weather.gov/products/types/REC/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`REC list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as ProductList;
  return list['@graph'] ?? [];
}

async function fetchRecProducts(office: RecOffice, limit = 20): Promise<RecBulletinEntry[]> {
  const products = (await fetchRecProductList(office)).slice(0, limit);
  const out: RecBulletinEntry[] = [];
  for (const meta of products) {
    const productUrl = `https://api.weather.gov/products/${meta.id}`;
    const productRes = await outsideFetch(productUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
      next: { revalidate: 0 },
    });
    if (!productRes.ok) continue;
    const product = (await productRes.json()) as ProductDoc;
    const text = product.productText ?? '';
    if (!text.trim()) continue;
    const issuanceTime = product.issuanceTime ?? meta.issuanceTime ?? null;
    const parsed = buildSourceResult({
      fetched: { ok: true, text, issuedAt: issuanceTime, sourceUrl: productUrl },
      parse: (body) => parseRecBulletin(body, issuanceTime, meta.id),
      issuedAt: issuanceTime,
    });
    if (parsed.status === 'error' || !parsed.data) continue;
    out.push({
      bulletin: parsed.data,
      issuanceTime,
      productId: meta.id,
      sourceUrl: productUrl,
    });
  }
  if (out.length === 0) throw new Error(`No REC products with parseable text for ${office}`);
  return out;
}

const historyReaders = new Map<RecOffice, () => Promise<SourceResult<RecBulletinEntry[]>>>();

export function readRecBulletinHistory(
  office: RecOffice,
  def: { id: string; url: string; ttlSeconds: number; expectedEveryHours?: number },
): Promise<SourceResult<RecBulletinEntry[]>> {
  let reader = historyReaders.get(office);
  if (!reader) {
    reader = cachedSourceRead({
      cacheKey: [def.id, office, 'history'],
      def,
      read: async () => {
        try {
          const entries = await fetchRecProducts(office);
          return {
            status: 'ok' as const,
            data: entries,
            issuedAt: entries[0]?.issuanceTime ?? null,
            validFrom: null,
            validTo: null,
            sourceUrl: def.url,
          };
        } catch (err) {
          return {
            status: 'error' as const,
            data: null,
            issuedAt: null,
            validFrom: null,
            validTo: null,
            sourceUrl: def.url,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    });
    historyReaders.set(office, reader);
  }
  return reader();
}