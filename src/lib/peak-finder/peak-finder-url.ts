export const PEAK_FINDER_PATH = '/peak-finder';
export const COORD_DECIMALS = 5;

export type PeakFinderUrlState =
  | { kind: 'start' }
  | { kind: 'pick-map' }
  | { kind: 'pick-view'; lat: number; lng: number }
  | { kind: 'explore' }
  | { kind: 'offline' }
  | { kind: 'area'; areaId: string };

export function validPeakFinderCoord(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function roundPeakFinderCoord(n: number): number {
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(n * factor) / factor;
}

function parseCoord(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Returns start for invalid or unknown query combinations. */
export function parsePeakFinderSearch(search: string): PeakFinderUrlState {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw.trim()) return { kind: 'start' };
  const params = new URLSearchParams(raw);

  const lat = parseCoord(params.get('lat'));
  const lng = parseCoord(params.get('lng'));
  if (lat != null && lng != null) {
    if (!validPeakFinderCoord(lat, lng)) return { kind: 'start' };
    return {
      kind: 'pick-view',
      lat: roundPeakFinderCoord(lat),
      lng: roundPeakFinderCoord(lng),
    };
  }
  if (params.has('lat') || params.has('lng')) return { kind: 'start' };

  const areaId = params.get('area');
  if (areaId != null && areaId.trim() !== '') {
    return { kind: 'area', areaId: areaId.trim() };
  }
  if (params.has('area')) return { kind: 'start' };

  const mode = params.get('mode');
  if (mode === 'pick') return { kind: 'pick-map' };
  if (mode === 'explore') return { kind: 'explore' };
  if (mode === 'offline') return { kind: 'offline' };
  if (mode != null) return { kind: 'start' };

  return { kind: 'start' };
}

export function hasUnrecognizedPeakFinderSearch(search: string): boolean {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw.trim()) return false;
  return parsePeakFinderSearch(search).kind === 'start';
}

export function buildPeakFinderSearch(state: PeakFinderUrlState): string {
  switch (state.kind) {
    case 'start':
      return '';
    case 'pick-map':
      return '?mode=pick';
    case 'explore':
      return '?mode=explore';
    case 'offline':
      return '?mode=offline';
    case 'pick-view':
      return `?lat=${roundPeakFinderCoord(state.lat).toFixed(COORD_DECIMALS)}&lng=${roundPeakFinderCoord(state.lng).toFixed(COORD_DECIMALS)}`;
    case 'area':
      return `?area=${encodeURIComponent(state.areaId)}`;
  }
}

export function peakFinderHref(state: PeakFinderUrlState): string {
  return `${PEAK_FINDER_PATH}${buildPeakFinderSearch(state)}`;
}
