export type MtnAmount = number | 'T' | null;

export function parseMtnToken(raw: string): number | 'T' | null {
  const v = raw.trim();
  if (!v || v === 'NR') return null;
  if (v === 'T') return 'T';
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseMtnCsvList(raw: unknown): (number | 'T' | null)[] {
  if (typeof raw !== 'string') return [];
  return raw.split(',').map((part) => parseMtnToken(part));
}

export function parseMtnNumberList(raw: unknown): (number | null)[] {
  return parseMtnCsvList(raw).map((v) => (typeof v === 'number' ? v : null));
}
