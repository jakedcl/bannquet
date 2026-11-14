import type { BulletinOffice } from '@/lib/mountain-weather/bulletin-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

export type NwsProductKind = 'AFD' | 'HWO';

type ProductList = { '@graph'?: { id: string; issuanceTime?: string }[] };
type ProductDoc = { productText?: string; issuanceTime?: string };

export async function fetchLatestNwsProductText(
  kind: NwsProductKind,
  office: BulletinOffice,
): Promise<{
  text: string;
  issuanceTime: string | null;
  productId: string | null;
  sourceUrl: string;
}> {
  const listUrl = `https://api.weather.gov/products/types/${kind}/locations/${office}`;
  const listRes = await outsideFetch(listUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!listRes.ok) throw new Error(`${kind} list HTTP ${listRes.status}`);
  const list = (await listRes.json()) as ProductList;
  const latest = list['@graph']?.[0];
  if (!latest?.id) throw new Error(`No ${kind} products in feed for ${office}`);
  const productUrl = `https://api.weather.gov/products/${latest.id}`;
  const productRes = await outsideFetch(productUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    next: { revalidate: 0 },
  });
  if (!productRes.ok) throw new Error(`${kind} product HTTP ${productRes.status}`);
  const product = (await productRes.json()) as ProductDoc;
  const text = product.productText ?? '';
  if (!text.trim()) throw new Error(`Empty ${kind} productText`);
  const issuanceTime = product.issuanceTime ?? latest.issuanceTime ?? null;
  return { text, issuanceTime, productId: latest.id, sourceUrl: productUrl };
}