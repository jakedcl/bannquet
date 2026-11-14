import type { MmnDepthPoint } from '@/lib/mountain-weather/mansfield-types';

export function parseMmnHighchartsSeries(text: string): MmnDepthPoint[] {
  const out: MmnDepthPoint[] = [];
  const re = /\[Date\.UTC\((\d+),(\d+),(\d+),0\),([^\]]+)\]/g;
  for (const match of text.matchAll(re)) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]);
    const day = Number(match[3]);
    const rawVal = match[4].trim();
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) continue;
    const depthIn = rawVal === 'null' || rawVal === '' ? null : Number(rawVal);
    out.push({
      monthIndex,
      day,
      depthIn: depthIn !== null && Number.isFinite(depthIn) ? depthIn : null,
    });
  }
  if (out.length === 0) throw new Error('No depth points in series');
  return out;
}
