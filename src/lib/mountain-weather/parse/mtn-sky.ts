/** BTV/ALY standard table sky codes. */
export function skyLabelStandard(code: string | null): string | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  const map: Record<string, string> = {
    IO: 'In and out of clouds',
    OB: 'Obscured',
    AB: 'Above',
  };
  return map[key] ?? code;
}

/** BTV enhanced uses 101–103; ALY often sends sky-cover percent. */
export function skyLabelEnhanced(code: string | null, office: 'BTV' | 'ALY'): string | null {
  if (code === null || code === undefined || code === '') return null;
  const n = Number(code);
  if (office === 'BTV') {
    if (n === 101) return 'In and out of clouds';
    if (n === 102) return 'Obscured';
    if (n === 103) return 'Above';
  }
  if (Number.isFinite(n) && n >= 0 && n <= 100) {
    return `${n}% sky cover`;
  }
  return String(code);
}

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function windDirFromDegrees(deg: number | null): string | null {
  if (deg === null || !Number.isFinite(deg)) return null;
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return DIRS[idx] ?? null;
}
