import { cachedSourceRead } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { MansfieldRr2Summit } from '@/lib/mountain-weather/mansfield-types';
import { parseRr2MansfieldSummit } from '@/lib/mountain-weather/parse/rr2-mansfield';
import { NWS_RR2_BTV_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

async function load(): Promise<SourceResult<MansfieldRr2Summit>> {
  const def = NWS_RR2_BTV_DEF;
  try {
    const listUrl = `https://api.weather.gov/products/types/RR2/locations/BTV`;
    const listRes = await outsideFetch(listUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
      next: { revalidate: 0 },
    });
    if (!listRes.ok) throw new Error(`RR2 list HTTP ${listRes.status}`);
    const list = (await listRes.json()) as { '@graph'?: { id: string; issuanceTime?: string }[] };
    const latest = list['@graph']?.[0];
    if (!latest?.id) throw new Error('No RR2 products in feed');
    const productUrl = `https://api.weather.gov/products/${latest.id}`;
    const productRes = await outsideFetch(productUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
      next: { revalidate: 0 },
    });
    if (!productRes.ok) throw new Error(`RR2 product HTTP ${productRes.status}`);
    const product = (await productRes.json()) as { productText?: string; issuanceTime?: string };
    const text = product.productText ?? '';
    const parsed = parseRr2MansfieldSummit(text);
    const issuedAt = product.issuanceTime ?? latest.issuanceTime ?? null;
    if (!parsed) {
      return {
        status: 'error',
        data: null,
        issuedAt,
        validFrom: null,
        validTo: null,
        sourceUrl: productUrl,
        error: 'No MMNV1 summit temperature line in latest RR2 (BTV)',
      };
    }
    const base: SourceResult<MansfieldRr2Summit> = {
      status: 'ok',
      data: parsed,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: productUrl,
    };
    return mergeFreshness(freshnessFromIssued(issuedAt, def.expectedEveryHours), base);
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

const readCached = cachedSourceRead({
  cacheKey: [NWS_RR2_BTV_DEF.id],
  def: NWS_RR2_BTV_DEF,
  read: load,
});

export async function readRr2BtvMansfieldSummit(): Promise<SourceResult<MansfieldRr2Summit>> {
  return readCached();
}
