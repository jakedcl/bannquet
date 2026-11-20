import type { MansfieldRr2Summit, Rr2ShefField } from '@/lib/mountain-weather/mansfield-types';

function parseShefTail(tail: string): Rr2ShefField[] {
  const fields: Rr2ShefField[] = [];
  const seen = new Set<string>();
  const add = (code: string, value: string | null) => {
    const key = code.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    fields.push({ code: key, value });
  };

  for (const segment of tail.split('/').map((s) => s.trim()).filter(Boolean)) {
    const paired = segment.match(/^([A-Z][A-Z0-9]+)\s+(-?[\d.]+|T)$/i);
    if (paired) {
      add(paired[1], paired[2]);
      continue;
    }
    const codeOnly = segment.match(/^([A-Z][A-Z0-9]+)$/i);
    if (codeOnly) {
      add(codeOnly[1], null);
    }
  }

  for (const match of tail.matchAll(/([A-Z][A-Z0-9]{3,})\s+(-?[\d.]+|T)\b/g)) {
    add(match[1], match[2]);
  }

  return fields;
}

/** SHEF codes in the Mansfield RR2 line, in words. */
export const SHEF_CODE_LABELS: Record<string, string> = {
  TAIRGZZ: 'Air temperature (°F)',
  TA: 'Air temperature (°F)',
  SD: 'Snow depth (in)',
  SF: 'New snow (in)',
  PP: 'Precipitation (in)',
  US: 'Wind speed (mph)',
  UD: 'Wind direction (°)',
  UG: 'Wind gust (mph)',
  XR: 'Relative humidity (%)',
};

/** `.A MMNV1 261120 Z` + `DH0148` -> 2026-11-20T01:48:00Z. */
export function shefObservedAt(reportHeader: string | null, tail: string): string | null {
  const date = reportHeader?.match(/\s(\d{2})(\d{2})(\d{2})\s+Z\b/i);
  const time = tail.match(/\bDH(\d{2})(\d{2})?/i);
  if (!date || !time) return null;
  const iso = `20${date[1]}-${date[2]}-${date[3]}T${time[1]}:${time[2] ?? '00'}:00Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function parseRr2MansfieldSummit(productText: string): MansfieldRr2Summit | null {
  const lines = productText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!/MMNV1/i.test(line)) continue;
    const headerMatch = line.match(/^(\.A\s+MMNV1\s+\S+\s+\S+)\s+(.+)$/i);
    if (!headerMatch) {
      return {
        stationId: 'MMNV1',
        rawLine: line,
        reportHeader: null,
        shefFields: [],
        summitTempF: null,
        observedAt: null,
      };
    }
    const reportHeader = headerMatch[1].trim();
    const tail = headerMatch[2].trim();
    const shefFields = parseShefTail(tail);
    const tair = shefFields.find((f) => f.code === 'TAIRGZZ');
    const summitTempF =
      tair?.value !== null && tair?.value !== undefined && tair.value !== 'T'
        ? Number(tair.value)
        : null;
    return {
      stationId: 'MMNV1',
      rawLine: line,
      reportHeader,
      shefFields,
      summitTempF: summitTempF !== null && Number.isFinite(summitTempF) ? summitTempF : null,
      observedAt: shefObservedAt(reportHeader, tail),
    };
  }
  return null;
}
