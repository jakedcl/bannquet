import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import { parseHwoProduct } from '@/lib/mountain-weather/parse/hwo';
import { NWS_HWO_BTV_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { fetchLatestNwsProductText } from '@/lib/mountain-weather/readers/nws-product-text';

async function loadHwoBtv(): Promise<SourceResult<NwsTextProduct>> {
  const def = NWS_HWO_BTV_DEF;
  try {
    const fetched = await fetchLatestNwsProductText('HWO', 'BTV');
    const base = buildSourceResult({
      fetched: { ok: true, text: fetched.text, issuedAt: fetched.issuanceTime, sourceUrl: fetched.sourceUrl },
      parse: (text) => parseHwoProduct(text, fetched.productId),
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

const readCached = cachedSourceRead({
  cacheKey: [NWS_HWO_BTV_DEF.id],
  def: NWS_HWO_BTV_DEF,
  read: loadHwoBtv,
});

export async function readHwoBtv(): Promise<SourceResult<NwsTextProduct>> {
  return readCached();
}