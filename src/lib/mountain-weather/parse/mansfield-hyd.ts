import type { MansfieldHyd, MansfieldHydRow } from '@/lib/mountain-weather/mansfield-types';
import { detectSeasonalOffMessage } from '@/lib/mountain-weather/parse/seasonal-off';

function cell(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const v = raw.trim();
  return v === '' ? null : v;
}

function parseMansfieldRow(line: string): MansfieldHydRow | null {
  if (!/^Mount Mansfield\b/i.test(line)) return null;
  const rest = line.replace(/^Mount Mansfield\s+/i, '').trim();
  const chunks = rest.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length > 0);

  let precip24h: string | null = null;
  let tempMax: string | null = null;
  let tempMin: string | null = null;
  let tempCur: string | null = null;
  let presentWeather: string | null = null;
  let snowNew: string | null = null;
  let snowTotal: string | null = null;
  let swe: string | null = null;

  const tail: string[] = [];

  if (chunks.length > 0 && /^\d+\.\d+$/.test(chunks[0])) {
    precip24h = chunks.shift() ?? null;
  }

  const tempTokens: string[] = [];
  while (chunks.length > 0) {
    const head = chunks[0];
    if (head.includes(' ')) {
      const split = head.split(/\s+/).filter(Boolean);
      if (split.length > 0 && /^-?\d+$/.test(split[0])) {
        tempTokens.push(...split);
        chunks.shift();
      }
      break;
    }
    if (/^-?\d+$/.test(head)) {
      tempTokens.push(head);
      chunks.shift();
      if (tempTokens.length >= 3) break;
      continue;
    }
    break;
  }
  if (tempTokens.length > 0) {
    tempMax = cell(tempTokens[0]);
    tempMin = cell(tempTokens[1]);
    tempCur = cell(tempTokens[2]);
  }

  for (const chunk of chunks) {
    if (/^-?\d+$/.test(chunk) || chunk === 'T' || /^\d+\.\d+$/.test(chunk)) {
      tail.push(chunk);
    } else {
      presentWeather = presentWeather ? `${presentWeather} ${chunk}` : chunk;
    }
  }

  if (tail.length === 1) {
    const only = tail[0];
    if (only === 'T') snowNew = 'T';
    else if (/^-?\d+\.?\d*$/.test(only)) snowTotal = cell(only);
    else snowNew = cell(only);
  } else {
    if (tail.length >= 1) snowNew = cell(tail[0]);
    if (tail.length >= 2) snowTotal = cell(tail[1]);
    if (tail.length >= 3) swe = cell(tail[2]);
  }

  return {
    station: 'Mount Mansfield',
    precip24h,
    tempMax,
    tempMin,
    tempCur,
    presentWeather,
    snowNew,
    snowTotal,
    swe,
  };
}

export function parseMansfieldHydText(text: string): MansfieldHyd {
  const seasonalMessage = detectSeasonalOffMessage(text);
  const lines = text.split('\n').map((l) => l.trimEnd());
  const headerLines: string[] = [];
  let row: MansfieldHydRow | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Station') || trimmed.startsWith('24 Hrs') || trimmed === '$$') continue;
    if (trimmed.startsWith('...') || /County\.\.\./.test(trimmed)) continue;
    const parsed = parseMansfieldRow(trimmed);
    if (parsed) {
      row = parsed;
      break;
    }
    if (/National Weather Service|Hydrometeorological|Burlington|PM |AM /i.test(trimmed)) {
      headerLines.push(trimmed);
    }
  }
  if (!row) {
    throw new Error('No Mount Mansfield row in hydrometeorological summary');
  }
  return {
    headerLines,
    row,
    seasonalOff: seasonalMessage !== null,
    seasonalMessage,
  };
}

export function parseMansfieldHydXml(xml: string): MansfieldHyd {
  const textMatch = xml.match(/<text>([\s\S]*?)<\/text>/i);
  const body = textMatch?.[1] ?? xml;
  return parseMansfieldHydText(body);
}
