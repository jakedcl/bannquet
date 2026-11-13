import type { MansfieldRr2Summit } from '@/lib/mountain-weather/mansfield-types';

export function parseRr2MansfieldSummit(productText: string): MansfieldRr2Summit | null {
  const lines = productText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!/MMNV1/i.test(line)) continue;
    const tempMatch = line.match(/TAIRGZZ\s+(-?\d+(?:\.\d+)?)/i);
    const summitTempF = tempMatch ? Number(tempMatch[1]) : null;
    return {
      stationId: 'MMNV1',
      rawLine: line,
      summitTempF: summitTempF !== null && Number.isFinite(summitTempF) ? summitTempF : null,
    };
  }
  return null;
}
