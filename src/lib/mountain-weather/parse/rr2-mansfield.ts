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
    };
  }
  return null;
}
