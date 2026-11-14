import type { BalloonCell, BalloonForecast, BalloonRegion, BalloonRow } from '@/lib/mountain-weather/balloon-types';
import { detectSeasonalOffMessage } from '@/lib/mountain-weather/parse/seasonal-off';

function normalizeSearchKey(title: string): string {
  return title.replace(/\s+/g, ' ').trim().toUpperCase();
}

function rowKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseCell(raw: string): BalloonCell {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return v;
}

function rowUnit(label: string): BalloonRow['unit'] {
  if (/3hrly|EST 3hrly|UTC 3hrly/i.test(label)) return 'hour';
  if (/Wind Spd|Wind Gst/i.test(label)) return 'kt';
  if (/^Temp|Min\/Max/i.test(label)) return 'deg';
  if (/PoP|Thunder|COVERAGE/i.test(label)) return 'percent';
  if (/Clouds/i.test(label)) return 'code';
  return null;
}

function parseDataLine(line: string): BalloonRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('For ') || /^Hot Air Balloon/i.test(trimmed)) return null;
  if (/^Date\s+/i.test(trimmed) || /^Including the/i.test(trimmed)) return null;
  const match = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9 /()%:\-]+?)\s{2,}(.+)$/);
  const labelOnly = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9 /()%:\-]+?)\s*$/);
  const label = (match?.[1] ?? labelOnly?.[1])?.trim();
  if (!label) return null;
  const values = match
    ? match[2]
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(parseCell)
    : [];
  if (values.length === 0 && !labelOnly && !match) return null;
  return { key: rowKey(label), label, values, unit: rowUnit(label) };
}

function splitForecastBlocks(xml: string): string[] {
  return xml.split(/<forecast>/i).slice(1).map((chunk) => chunk.split(/<\/forecast>/i)[0] ?? chunk);
}

function parseRegionBlock(block: string): BalloonRegion | null {
  const textMatch = block.match(/<text>([\s\S]*?)<\/text>/i);
  const text = textMatch?.[1] ?? block;
  const seasonalMessage = detectSeasonalOffMessage(text);
  const lines = text.split('\n').map((l) => l.trimEnd());

  const productLines: string[] = [];
  let regionTitle: string | null = null;
  const cityLines: string[] = [];
  let issuanceLine: string | null = null;
  let estHours: string[] = [];
  let utcHours: string[] = [];
  const rows: BalloonRow[] = [];
  const sunriseSunsetLines: string[] = [];
  const tafLines: string[] = [];
  const footerLines: string[] = [];

  let inCities = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^Hot Air Balloon/i.test(trimmed) || /^National Weather Service Burlington/i.test(trimmed)) {
      productLines.push(trimmed);
      continue;
    }
    if (/^For .+\.\.\./i.test(trimmed)) {
      regionTitle = trimmed.replace(/^For\s+/i, '').replace(/\.\.\.$/, '').trim();
      inCities = true;
      continue;
    }
    if (inCities && /^Including the/i.test(trimmed)) {
      cityLines.push(trimmed);
      continue;
    }
    if (inCities && /^[A-Za-z].*406 PM|^\d{3,4} [AP]M/i.test(trimmed)) {
      issuanceLine = trimmed;
      inCities = false;
      continue;
    }
    if (inCities && !trimmed.startsWith('Date') && cityLines.length > 0 && !/^Including/.test(trimmed)) {
      cityLines.push(trimmed);
      continue;
    }
    if (/^EST 3hrly/i.test(trimmed)) {
      const vals = trimmed.replace(/^EST 3hrly\s+/i, '').split(/\s+/).filter(Boolean);
      estHours = vals;
      continue;
    }
    if (/^UTC 3hrly/i.test(trimmed)) {
      utcHours = trimmed.replace(/^UTC 3hrly\s+/i, '').split(/\s+/).filter(Boolean);
      continue;
    }
    if (/^SUNRISE AND SUNSET/i.test(trimmed) || /\.\.\.SUNRISE/i.test(trimmed)) {
      sunriseSunsetLines.push(trimmed.replace(/\.\.\./g, '').trim());
      continue;
    }
    if (/SUNRISE.*SUNSET/i.test(trimmed)) {
      sunriseSunsetLines.push(trimmed);
      continue;
    }
    if (/^[A-Z]{4}\s+\d{6}Z/.test(trimmed) || /^\s{4,}[A-Z]{2}\d{4}/.test(line) || /^\s{4,}(FM|PROB|TEMPO)/.test(line)) {
      tafLines.push(trimmed);
      continue;
    }
    if (/^Temp:|^Sfc:|^Wind Dir:|^PoP 6hr:|^NOTE:/i.test(trimmed)) {
      footerLines.push(trimmed);
      continue;
    }
    const row = parseDataLine(trimmed);
    if (row) rows.push(row);
  }

  if (!regionTitle) return null;
  return {
    productLines,
    regionTitle,
    searchKey: normalizeSearchKey(regionTitle),
    cityLines,
    issuanceLine,
    estHours,
    utcHours,
    rows,
    sunriseSunsetLines,
    tafLines,
    footerLines,
    seasonalOff: seasonalMessage !== null && rows.length === 0,
    seasonalMessage,
  };
}

export function parseBalloonXml(xml: string): BalloonForecast {
  const blocks = splitForecastBlocks(xml);
  const regions = blocks.map(parseRegionBlock).filter((r): r is BalloonRegion => r !== null);
  if (regions.length === 0) throw new Error('No balloon regions in XML');
  return { regions };
}

export function pickBalloonRegion(bulletin: BalloonForecast, regionMatch: string): BalloonRegion | null {
  const needle = normalizeSearchKey(regionMatch);
  const exact = bulletin.regions.find((r) => r.searchKey === needle);
  if (exact) return exact;
  return (
    bulletin.regions.find(
      (r) => r.searchKey.includes(needle) || needle.includes(r.searchKey) || r.regionTitle.toUpperCase().includes(regionMatch.toUpperCase()),
    ) ?? null
  );
}
