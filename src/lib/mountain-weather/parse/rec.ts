import type { RecBulletin, RecPeriod, RecSection, RecStructuredBand } from '@/lib/mountain-weather/rec-types';

function normalizeSearch(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseStructuredBands(block: string): RecStructuredBand[] {
  const bands: RecStructuredBand[] = [];
  const labelPattern = /\.([A-Z][A-Z0-9 /]+)\.\.\.\s*/g;
  const matches = [...block.matchAll(labelPattern)];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1].trim();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? block.length : block.length;
    const body = block.slice(start, end).trim();
    const fields: Record<string, string | null> = {};
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const kv = trimmed.match(/^([A-Za-z][^:]+)\.\.\.(.+)$/);
      if (kv) {
        const key = kv[1].trim();
        const value = kv[2].trim().replace(/\.$/, '');
        fields[key] = value || null;
      }
    }
    if (Object.keys(fields).length > 0) {
      bands.push({ label, fields });
    }
  }
  return bands;
}

function parsePeriods(block: string): RecPeriod[] {
  const periods: RecPeriod[] = [];
  const re = /\.([A-Z][A-Z0-9 /]+)\.\.\.([\s\S]*?)(?=\n\.[A-Z][A-Z]|\n&&|\n\$\$|$)/g;
  for (const match of block.matchAll(re)) {
    const name = match[1].trim();
    const text = match[2].trim();
    if (!text) continue;
    if (text.includes('Max Temperature')) continue;
    periods.push({ name, text });
  }
  return periods;
}

function splitRecBlocks(productText: string): string[] {
  const chunks = productText.split(/\n\$\$\s*\n/);
  const blocks: string[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/\n&&\n/).map((p) => p.trim()).filter(Boolean);
    blocks.push(...parts);
  }
  return blocks;
}

export function parseRecBulletin(productText: string, issuanceTime: string | null, productId: string | null): RecBulletin {
  const blocks = splitRecBlocks(productText);
  const sections: RecSection[] = [];
  for (const block of blocks) {
    const ellipsis = block.match(/\.\.\.([^.\n][\s\S]*?)\.\.\./);
    const theLine = block.match(/\.The ([^\n]+)\.\.\./);
    const zoneHeader =
      block
        .split('\n')
        .map((l) => l.trim())
        .find((l) => /-\s*$/.test(l) && l.length < 160) ?? null;
    const periods = parsePeriods(block);
    const bands = parseStructuredBands(block);
    if (!ellipsis && periods.length === 0 && bands.length === 0) continue;
    const ellipsisTitle = ellipsis?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
    sections.push({
      zoneHeader,
      ellipsisTitle,
      theTitle: theLine?.[1]?.trim() ?? null,
      periods,
      bands,
      searchText: normalizeSearch(zoneHeader, ellipsisTitle, theLine?.[1], block.slice(0, 500)),
    });
  }
  return { issuanceTime, productId, sections };
}

export function pickRecSection(bulletin: RecBulletin, sectionMatch: string): RecSection | null {
  const needle = sectionMatch.toLowerCase();
  const exact = bulletin.sections.find((s) => s.searchText.includes(needle));
  if (exact) return exact;
  return bulletin.sections.find((s) => normalizeSearch(s.ellipsisTitle, s.zoneHeader, s.theTitle).includes(needle)) ?? null;
}
