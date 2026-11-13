import { XMLParser } from 'fast-xml-parser';
import { skyLabelEnhanced, skyLabelStandard, windDirFromDegrees } from '@/lib/mountain-weather/parse/mtn-sky';
import { formatMtnHourEt, parseCycleStartNy, addHoursUtc } from '@/lib/mountain-weather/parse/mtn-time';
import {
  parseMtnCsvList,
  parseMtnNumberList,
  parseMtnToken,
  type MtnAmount,
} from '@/lib/mountain-weather/parse/mtn-values';
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

function parseLatLon(marker: Record<string, unknown>): { lat: number | null; lon: number | null } {
  const lat = Number(marker.LAT);
  const lon = Number(marker.LON);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

function parseElevationFt(text: string): number | null {
  const match = text.match(/at\s+([\d,]+)\s+ft/i);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
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

const DATA_ROW_PREFIXES: [key: string, prefixes: string[]][] = [
  ['time', ['TIME (EST)', 'TIME (EDT)', 'TIME']],
  ['temp', ['TEMP (F)', 'TEMP']],
  ['windDir', ['WIND DIR']],
  ['windSpd', ['WIND SPD (MPH)', 'WIND SPD']],
  ['windGst', ['WIND GST (MPH)', 'WIND GST']],
  ['sky', ['SKY COVER (%)', 'SKY COVER']],
  ['windChl', ['WIND CHL (F)', 'WIND CHL']],
  ['pop', ['PROB PRECIP (%)', 'PROB PRECIP']],
  ['lightning', ['LIGHTNING RISK', 'LIGHTNING']],
  ['snow', ['SNOW AMT (IN)', 'SNOW AMT']],
  ['ice', ['ICE ACCUM (IN)', 'ICE ACCUM']],
];

function findDataLine(lines: string[], prefixes: string[]): string | undefined {
  return lines.find((line) => prefixes.some((p) => line.startsWith(p)));
}

function rowTokensAfterPrefix(line: string, prefixes: string[]): string[] {
  const prefix = prefixes.find((p) => line.startsWith(p));
  if (!prefix) return [];
  return line.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
}

function parseDataRows(lines: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, prefixes] of DATA_ROW_PREFIXES) {
    const line = findDataLine(lines, prefixes);
    out[key] = line ? rowTokensAfterPrefix(line, prefixes) : [];
  }
  return out;
}

function snowBlockLabelsFromTimes(times: string[]): string[] {
  const labels: string[] = [];
  for (let i = 0; i < times.length; i += 2) {
    if (times[i] !== undefined) labels.push(times[i]);
  }
  return labels;
}

function parseStandardTable(text: string): Pick<MtnStandardPoint, 'tabular' | 'snowBlocks' | 'iceBlocks' | 'snowBlockLabels'> {
  const section = text.split('Detailed Forecast Data:')[1];
  if (!section) {
    return { tabular: [], snowBlocks: [], iceBlocks: [], snowBlockLabels: [] };
  }
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = parseDataRows(lines);
  const times = rows.time ?? [];
  const temps = (rows.temp ?? []).map((t) => parseMtnToken(t)).map((v) => (typeof v === 'number' ? v : null));
  const windDirs = rows.windDir ?? [];
  const speeds = (rows.windSpd ?? []).map((t) => parseMtnToken(t)).map((v) => (typeof v === 'number' ? v : null));
  const gusts = (rows.windGst ?? []).map((t) => parseMtnToken(t)).map((v) => (typeof v === 'number' ? v : null));
  const skies = (rows.sky ?? []).map(skyLabelStandard);
  const chills = (rows.windChl ?? []).map((t) => parseMtnToken(t)).map((v) => (typeof v === 'number' ? v : null));
  const pops = (rows.pop ?? []).map((t) => parseMtnToken(t)).map((v) => (typeof v === 'number' ? v : null));
  const lightning = rows.lightning ?? [];
  const snowBlocks = (rows.snow ?? []).map((t) => parseMtnToken(t)) as MtnAmount[];
  const iceBlocks = (rows.ice ?? []).map((t) => parseMtnToken(t)) as MtnAmount[];

  const tabular: MtnTabularPeriod[] = times.map((label, index) => ({
    label,
    tempF: temps[index] ?? null,
    windDir: windDirs[index] ?? null,
    windMph: speeds[index] ?? null,
    gustMph: gusts[index] ?? null,
    sky: skies[index] ?? null,
    windChillF: chills[index] ?? null,
    precipPct: pops[index] ?? null,
    lightning: lightning[index] ?? null,
  }));

  return {
    tabular,
    snowBlocks,
    iceBlocks,
    snowBlockLabels: snowBlockLabelsFromTimes(times),
  };
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
    const table = parseStandardTable(text);
    out[location] = {
      location,
      lat,
      lon,
      elevationFt: parseElevationFt(text),
      issuedLine: parseIssuedLine(text),
      narratives: parseNarratives(text),
      tabular: table.tabular,
      snowBlocks: table.snowBlocks,
      iceBlocks: table.iceBlocks,
      snowBlockLabels: table.snowBlockLabels,
    };
  }
  return out;
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
    const textStub = String(marker.TEXT ?? '');
    const elevationFt = parseElevationFt(textStub);
    const cycleStart = typeof marker.DATE === 'string' ? parseCycleStartNy(marker.DATE) : null;
    const temps = parseMtnNumberList(marker.TEMP);
    const winds = parseMtnNumberList(marker.WIND);
    const speeds = parseMtnNumberList(marker.SPEED);
    const gusts = marker.GUST !== undefined ? parseMtnNumberList(marker.GUST) : [];
    const skies = typeof marker.SKY === 'string' ? marker.SKY.split(',') : [];
    const chills = parseMtnNumberList(marker.CHILL);
    const pops = parseMtnNumberList(marker.POP);
    const snowBlocks = parseMtnCsvList(marker.SNOW);
    const iceBlocks = marker.ICE !== undefined ? parseMtnCsvList(marker.ICE) : [];

    const hourly: MtnEnhancedPeriod[] = temps.map((tempF, index) => {
      const time = cycleStart ? addHoursUtc(cycleStart, index) : new Date(NaN);
      const windDeg = winds[index] ?? null;
      return {
        time,
        label: cycleStart
          ? formatMtnHourEt(time)
          : `H+${index}`,
        tempF,
        windDirDeg: windDeg,
        windDir: windDirFromDegrees(windDeg),
        windMph: speeds[index] ?? null,
        gustMph: gusts[index] ?? null,
        sky: skyLabelEnhanced(skies[index] ?? null, office),
        windChillF: chills[index] ?? null,
        precipPct: pops[index] ?? null,
      };
    });

    out[location] = {
      location,
      lat,
      lon,
      elevationFt,
      cycleStart,
      hourly,
      snowBlocks,
      iceBlocks,
    };
  }
  return out;
}
