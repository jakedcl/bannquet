import type { FzlBulletin, FzlObservation, FzlOffice, FzlRadat } from '@/lib/mountain-weather/fzl-types';

function hundredFt(code: string): number {
  const n = Number(code);
  return Number.isFinite(n) ? n * 100 : NaN;
}

export function parseRadatPayload(payload: string): FzlRadat {
  const raw = payload.trim().toUpperCase();
  if (raw === 'ZERO') {
    return {
      kind: 'surface',
      rhPercent: null,
      rhLevel: null,
      levelsFt: [0],
      additionalCrossings: 0,
      payload: raw,
      decodeNote: 'Freezing level at the surface',
    };
  }
  if (raw === 'MISG') {
    return {
      kind: 'missing',
      rhPercent: null,
      rhLevel: null,
      levelsFt: [],
      additionalCrossings: 0,
      payload: raw,
      decodeNote: 'RADAT missing (high winds or equipment failure)',
    };
  }

  const slash = raw.match(/^(\d{2})([LH]?)((?:\d{3})+)\/(\d+)$/);
  if (slash) {
    const levels: number[] = [];
    const body = slash[3];
    for (let i = 0; i < body.length; i += 3) {
      const ft = hundredFt(body.slice(i, i + 3));
      if (Number.isFinite(ft)) levels.push(ft);
    }
    return {
      kind: 'multi',
      rhPercent: Number(slash[1]),
      rhLevel: slash[2] === 'L' ? 'low' : slash[2] === 'H' ? 'high' : null,
      levelsFt: levels,
      additionalCrossings: Number(slash[4]) || 0,
      payload: raw,
      decodeNote: null,
    };
  }

  const lhMulti = raw.match(/^(\d{2})([LH])((?:\d{3})+)$/);
  if (lhMulti) {
    const levels: number[] = [];
    const body = lhMulti[3];
    for (let i = 0; i < body.length; i += 3) {
      const ft = hundredFt(body.slice(i, i + 3));
      if (Number.isFinite(ft)) levels.push(ft);
    }
    return {
      kind: 'multi',
      rhPercent: Number(lhMulti[1]),
      rhLevel: lhMulti[2] === 'L' ? 'low' : 'high',
      levelsFt: levels,
      additionalCrossings: 0,
      payload: raw,
      decodeNote: null,
    };
  }

  const single = raw.match(/^(\d{2})(\d{3})$/);
  if (single) {
    const ft = hundredFt(single[2]);
    return {
      kind: 'single',
      rhPercent: Number(single[1]),
      rhLevel: null,
      levelsFt: Number.isFinite(ft) ? [ft] : [],
      additionalCrossings: 0,
      payload: raw,
      decodeNote: null,
    };
  }

  return {
    kind: 'other',
    rhPercent: null,
    rhLevel: null,
    levelsFt: [],
    additionalCrossings: 0,
    payload: raw,
    decodeNote: 'Unrecognized RADAT coding; see raw payload',
  };
}

function parseObservationLine(line: string, office: FzlOffice): FzlObservation | null {
  const match = line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+RADAT\s+(\S+)/i);
  if (!match) return null;
  const station = match[1].toUpperCase();
  const payload = match[3].replace(/=+$/, '');
  const radat = parseRadatPayload(payload);
  return {
    office,
    station,
    cycleHhmm: match[2],
    radat,
  };
}

export function parseFzlProduct(text: string, office: FzlOffice, productId: string | null, issuanceTime: string | null): FzlBulletin {
  const rawText = text.trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let wmoHeader: string | null = null;
  let productPil: string | null = null;
  let observation: FzlObservation | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^UXUS\d+\s+[A-Z]{4}\s+\d{6}/i.test(line)) wmoHeader = line;
    if (/^FZL[A-Z]{3}$/i.test(line)) productPil = line.toUpperCase();
    const obs = parseObservationLine(line, office);
    if (obs) observation = obs;
  }

  const preamble = lines
    .filter((l) => l !== observation?.station && !/^RADAT/i.test(l))
    .join('\n');

  return {
    office,
    productId,
    issuanceTime,
    wmoHeader,
    productPil,
    observation,
    preamble: preamble || rawText,
    rawText,
  };
}