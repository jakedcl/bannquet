import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import { parseNwsDiscussionSections } from '@/lib/mountain-weather/parse/nws-discussion';

export function parseAfdProduct(
  productText: string,
  productId: string | null,
): NwsTextProduct {
  const { preamble, sections } = parseNwsDiscussionSections(productText);
  return {
    productCode: 'AFD',
    productId,
    preamble,
    sections,
    rawText: productText,
  };
}