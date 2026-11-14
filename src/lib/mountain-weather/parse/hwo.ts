import type { NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import { parseNwsDiscussionSections } from '@/lib/mountain-weather/parse/nws-discussion';

export function parseHwoProduct(
  productText: string,
  productId: string | null,
): NwsTextProduct {
  const { preamble, sections } = parseNwsDiscussionSections(productText);
  return {
    productCode: 'HWO',
    productId,
    preamble,
    sections,
    rawText: productText,
  };
}