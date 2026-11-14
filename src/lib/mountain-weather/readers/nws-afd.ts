import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { BulletinOffice, NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import { parseAfdProduct } from '@/lib/mountain-weather/parse/afd';
import { afdSourceDef } from '@/lib/mountain-weather/nws-office';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { fetchLatestNwsProductText } from '@/lib/mountain-weather/readers/nws-product-text';

async function loadAfd(office: BulletinOffice): Promise<SourceResult<NwsTextProduct>> {
  const def = afdSourceDef(office);
  try {
    const fetched = await fetchLatestNwsProductText('AFD', office);
    const base = buildSourceResult({
      fetched: { ok: true, text: fetched.text, issuedAt: fetched.issuanceTime, sourceUrl: fetched.sourceUrl },
      parse: (text) => parseAfdProduct(text, fetched.productId),
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

const officeReaders = new Map<BulletinOffice, () => Promise<SourceResult<NwsTextProduct>>>();

function readerForOffice(office: BulletinOffice) {
  let reader = officeReaders.get(office);
  if (!reader) {
    const def = afdSourceDef(office);
    reader = cachedSourceRead({
      cacheKey: [def.id, office],
      def,
      read: () => loadAfd(office),
    });
    officeReaders.set(office, reader);
  }
  return reader;
}

export async function readAfdForOffice(office: BulletinOffice): Promise<SourceResult<NwsTextProduct>> {
  return readerForOffice(office)();
}