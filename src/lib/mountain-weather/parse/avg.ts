import type { AvgBulletin, AvgDateGrid, AvgPoint, AvgTableRow } from '@/lib/mountain-weather/avg-types';
import { normalizeAvgSearchKey, parseAvgToken } from '@/lib/mountain-weather/parse/avg-values';
import { detectSeasonalOffMessage } from '@/lib/mountain-weather/parse/seasonal-off';

const OFF_SEASON_AVG = [
  /avalanche weather guidance.*not/i,
  /no (?:avg|avalanche weather guidance) (?:will be )?issued/i,
];

function detectAvgSeasonal(text: string): string | null {
  for (const re of OFF_SEASON_AVG) {
    const hit = text.match(re);
    if (hit) return hit[0];
  }
  return detectSeasonalOffMessage(text);
}

function parseElevationFt(title: string): number | null {
  const match = title.match(/\((\d[\d,]*)\s*ft\)/i);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function splitPointBlocks(text: string): string[] {
  const parts = text.split(/\n\s*\.\.\./);
  const blocks: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = `...${parts[i]}`;
    const end = chunk.indexOf('\n\n...');
    blocks.push(end === -1 ? chunk : chunk.slice(0, end));
  }
  return blocks;
}

function rowLabelKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseDataLine(line: string): AvgTableRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('Date ') || trimmed.startsWith('DATE ')) return null;
  const match = trimmed.match(/^([\dA-Za-z][\dA-Za-z0-9 /()%:\-]+?)\s{2,}(.+)$/);
  const labelOnly = trimmed.match(/^([\dA-Za-z][\dA-Za-z0-9 /()%:\-]+?)\s*$/);
  const label = (match?.[1] ?? labelOnly?.[1])?.trim();
  if (!label) return null;
  if (label === 'Time (LT)' || label === 'TIME (LT)') return null;
  const values = match
    ? match[2]
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .map(parseAvgToken)
    : [];
  if (values.length === 0 && !labelOnly && !match) return null;
  return { key: rowLabelKey(label), label, values };
}

function parseTimeLabels(segmentLines: string[]): string[] {
  const timeIdx = segmentLines.findIndex((l) => /^Time \(LT\)/i.test(l) || /^TIME \(LT\)/i.test(l));
  if (timeIdx === -1) return [];
  for (let i = timeIdx + 1; i < Math.min(timeIdx + 4, segmentLines.length); i++) {
    const tokens = segmentLines[i].split(/\s+/).filter(Boolean);
    const hourish = tokens.filter((t) => /^\d{1,2}$/.test(t) || /^\d{1,2}[ap]$/i.test(t));
    if (hourish.length >= 4) return tokens;
  }
  return [];
}

function parseDateGrids(block: string): AvgDateGrid[] {
  const lines = block.split('\n');
  const grids: AvgDateGrid[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!/^\s*Date\s+/i.test(line)) {
      i += 1;
      continue;
    }
    const dateHeading = line.trim();
    const segmentLines: string[] = [];
    i += 1;
    while (i < lines.length && !/^\s*Date\s+/i.test(lines[i])) {
      segmentLines.push(lines[i]);
      i += 1;
    }
    const rows: AvgTableRow[] = [];
    for (const segLine of segmentLines) {
      const row = parseDataLine(segLine);
      if (row) rows.push(row);
    }
    if (rows.length > 0) {
      grids.push({
        dateHeading,
        timeLabels: parseTimeLabels(segmentLines.map((l) => l.trim())),
        rows,
      });
    }
  }
  return grids;
}

function parsePointBlock(block: string): AvgPoint | null {
  const titleMatch = block.match(/\.\.\.([\s\S]*?)\.\.\./);
  if (!titleMatch) return null;
  const title = titleMatch[1].replace(/\s+/g, ' ').trim();
  if (!title) return null;
  const grids = parseDateGrids(block);
  if (grids.length === 0) return null;
  return {
    title,
    elevationFt: parseElevationFt(title),
    searchKey: normalizeAvgSearchKey(title),
    grids,
  };
}

export function parseAvgBulletin(
  productText: string,
  issuanceTime: string | null,
  productId: string | null,
): AvgBulletin {
  const seasonalMessage = detectAvgSeasonal(productText);
  const blocks = splitPointBlocks(productText);
  const points = blocks.map(parsePointBlock).filter((p): p is AvgPoint => p !== null);
  return {
    issuanceTime,
    productId,
    points,
    seasonalOff: seasonalMessage !== null && points.length === 0,
    seasonalMessage,
  };
}

export function pickAvgPoint(bulletin: AvgBulletin, pointMatch: string): AvgPoint | null {
  const needle = normalizeAvgSearchKey(pointMatch);
  const exact = bulletin.points.find((p) => p.searchKey === needle);
  if (exact) return exact;
  return (
    bulletin.points.find(
      (p) => p.searchKey.includes(needle) || needle.includes(p.searchKey) || p.title.toUpperCase().includes(pointMatch.toUpperCase()),
    ) ?? null
  );
}
