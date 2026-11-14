import type { MansfieldProfile, ProfileStationRow } from '@/lib/mountain-weather/mansfield-types';

function numCell(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strCell(raw: string): string | null {
  const v = raw.trim();
  return v === '' ? null : v;
}

export function parseBtvPublicProfile(xmlOrText: string): MansfieldProfile {
  const textMatch = xmlOrText.match(/<text>([\s\S]*?)<\/text>/i);
  const text = (textMatch?.[1] ?? xmlOrText).trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stations: ProfileStationRow[] = [];
  let lapse: string | null = null;
  let shear: string | null = null;
  let froude: string | null = null;
  let lclFt: string | null = null;

  for (const line of lines) {
    const metric = line.match(/^(Lapse|Shear|Froude|LCL),(.+)$/i);
    if (metric) {
      const key = metric[1].toLowerCase();
      const value = strCell(metric[2]);
      if (key === 'lapse') lapse = value;
      else if (key === 'shear') shear = value;
      else if (key === 'froude') froude = value;
      else if (key === 'lcl') lclFt = value;
      continue;
    }
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 2 || !/^[A-Z]{4}$/.test(parts[0])) continue;
    stations.push({
      id: parts[0],
      elevationFt: numCell(parts[1] ?? ''),
      temperature: strCell(parts[2] ?? ''),
      windDir: strCell(parts[3] ?? ''),
      wind: strCell(parts[4] ?? ''),
      gust: strCell(parts[5] ?? ''),
    });
  }

  if (stations.length === 0) throw new Error('No profile station rows');

  return { stations, lapse, shear, froude, lclFt };
}
