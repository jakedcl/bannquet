import { XMLParser } from 'fast-xml-parser';
import { skyLabelEnhanced, skyLabelStandard, windDirFromDegrees } from '@/lib/mountain-weather/parse/mtn-sky';

function attachSnowIce(
  hourly: MtnEnhancedPeriod[],
  snowBlocks: number[],
  iceBlocks: number[],
): MtnEnhancedPeriod[] {
  return hourly.map((row, index) => ({
    ...row,
    snowIn: snowBlocks[Math.floor(index / 6)] ?? null,
    iceIn: iceBlocks[Math.floor(index / 6)] ?? null,
  }));
}
import type {
  MtnEnhancedPeriod,
  MtnEnhancedPoint,
  MtnNarrativePeriod,
  MtnStandardPoint,
  MtnTabularPeriod,
} from '@/lib/mountain-weather/mtn-point-types';

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === 'MARKER',
});

function numList(raw: unknown): number[] {
  if (typeof raw !== 'string') return [];
  return raw.split(',').map((part) => {
    const v = part.trim();
    if (v === 'T' || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

function parseNumber(raw: string): number | null {
  const v = raw.trim();
  if (!v || v === 'T' || v === 'NR') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseLatLon(marker: Record<string, unknown>) {
  const lat = Number(marker.LAT);
  const lon = Number(marker.LON);
  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lon: Number.isFinite(lon) ? lon : 0,
  };
}

function parseNarratives(text: string): MtnNarrativePeriod[] {
  const body = text.split('Detailed Forecast Data:')[0] ?? text;
  const re = /\.(\s*)((?:TONIGHT|THIS (?:AFTERNOON|EVENING|MORNING)|[A-Z]+(?:DAY)?(?: NIGHT)?))\.{3}/g;
  const out: MtnNarrativePeriod[] = [];
  const matches = [...body.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const name = match[2].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? body.length : body.length;
    const narrative = body.slice(start, end).replace(/\s+/g, ' ').trim();
    if (name && narrative) out.push({ name, text: narrative });
  }
  return out;
}

function rowCells(line: string): string[] {
  const split = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (split.length >= 2) {
    return split[split.length - 1].split(/\s+/).filter(Boolean);
  }
  const tokens = line.trim().split(/\s+/);
  const firstValue = tokens.findIndex((token) => /^-?\d/.test(token) || token === 'NR' || token === 'IO' || token === 'OB');
  if (firstValue === -1) return tokens.slice(2);
  return tokens.slice(firstValue);
}

function parseStandardTable(text: string): MtnTabularPeriod[] {
  const section = text.split('Detailed Forecast Data:')[1];
  if (!section) return [];
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
  const timeLine = lines.find((l) => l.startsWith('TIME'));
  if (!timeLine) return [];
  const times = rowCells(timeLine);
  const pick = (prefix: string) => lines.find((l) => l.startsWith(prefix));
  const temps = rowCells(pick('TEMP') ?? '').map(parseNumber);
  const windDirs = rowCells(pick('WIND DIR') ?? '');
  const speeds = rowCells(pick('WIND SPD') ?? '').map(parseNumber);
  const gusts = rowCells(pick('WIND GST') ?? '').map(parseNumber);
  const skies = rowCells(pick('SKY COVER') ?? '').map(skyLabelStandard);
  const chills = rowCells(pick('WIND CHL') ?? '').map(parseNumber);
  const pops = rowCells(pick('PROB PRECIP') ?? '').map(parseNumber);
  const lightning = rowCells(pick('LIGHTNING') ?? '');
  const snow = rowCells(pick('SNOW AMT') ?? '').map(parseNumber);
  const ice = rowCells(pick('ICE ACCUM') ?? '').map(parseNumber);
  return times.map((label, index) => ({
    label,
    tempF: temps[index] ?? null,
    windDir: windDirs[index] ?? null,
    windMph: speeds[index] ?? null,
    gustMph: gusts[index] ?? null,
    sky: skies[index] ?? null,
    windChillF: chills[index] ?? null,
    precipPct: pops[index] ?? null,
    lightning: lightning[index] ?? null,
    snowIn: snow[index] ?? null,
    iceIn: ice[index] ?? null,
  }));
}

function parseIssuedLine(text: string): string | null {
  const match = text.match(/Last Updated at\s+(.+?)\s+\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4}/i);
  return match ? match[0] : null;
}

export function parseMtnStandardXml(xml: string): Record<string, MtnStandardPoint> {
  const doc = parser.parse(xml) as { MARKERS?: { MARKER?: unknown } };
  const markers = doc.MARKERS?.MARKER;
  const list = Array.isArray(markers) ? markers : markers ? [markers] : [];
  const out: Record<string, MtnStandardPoint> = {};
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const marker = entry as Record<string, unknown>;
    const location = String(marker.LOCATION ?? '').trim().toUpperCase();
    if (!location) continue;
    const text = String(marker.TEXT ?? '');
    const { lat, lon } = parseLatLon(marker);
    out[location] = {
      location,
      lat,
      lon,
      issuedLine: parseIssuedLine(text),
      narratives: parseNarratives(text),
      tabular: parseStandardTable(text),
    };
  }
  return out;
}

function parseCycleStart(raw: string): Date | null {
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month0, day, hour] = parts;
  return new Date(year, month0, day, hour);
}

export function parseMtnEnhancedXml(xml: string, office: 'BTV' | 'ALY'): Record<string, MtnEnhancedPoint> {
  const doc = parser.parse(xml) as { MARKERS?: { MARKER?: unknown } };
  const markers = doc.MARKERS?.MARKER;
  const list = Array.isArray(markers) ? markers : markers ? [markers] : [];
  const out: Record<string, MtnEnhancedPoint> = {};
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const marker = entry as Record<string, unknown>;
    const location = String(marker.LOCATION ?? '').trim().toUpperCase();
    if (!location) continue;
    const { lat, lon } = parseLatLon(marker);
    const cycleStart = typeof marker.DATE === 'string' ? parseCycleStart(marker.DATE) : null;
    const temps = numList(marker.TEMP);
    const winds = numList(marker.WIND);
    const speeds = numList(marker.SPEED);
    const gusts = marker.GUST !== undefined ? numList(marker.GUST) : [];
    const skies = typeof marker.SKY === 'string' ? marker.SKY.split(',') : [];
    const chills = numList(marker.CHILL);
    const pops = numList(marker.POP);
    const snowBlocks = numList(marker.SNOW);
    const iceBlocks = marker.ICE !== undefined ? numList(marker.ICE) : [];
    const hourly = temps.map((tempF, index) => {
      const time = cycleStart ? new Date(cycleStart.getTime() + index * 3600_000) : new Date(NaN);
      const windDeg = winds[index] ?? null;
      return {
        time,
        label: Number.isNaN(time.getTime())
          ? `H+${index}`
          : time.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', month: 'short', day: 'numeric' }),
        tempF,
        windDirDeg: windDeg ?? null,
        windDir: windDirFromDegrees(windDeg ?? null),
        windMph: speeds[index] ?? null,
        gustMph: gusts[index] ?? null,
        sky: skyLabelEnhanced(skies[index] ?? null, office),
        windChillF: chills[index] ?? null,
        precipPct: pops[index] ?? null,
        snowIn: null,
        iceIn: null,
      };
    });
    out[location] = {
      location,
      lat,
      lon,
      cycleStart,
      hourly: attachSnowIce(hourly, snowBlocks, iceBlocks),
      snowBlocks,
      iceBlocks,
    };
  }
  return out;
}
