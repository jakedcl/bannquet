import nwsPoints from '../../../config/mountain-weather/nws-points.json';

const points = nwsPoints as {
  points: Record<string, { county?: string }>;
};

export function countyFipsForPlace(placeId: string): string | null {
  const countyUrl = points.points[placeId]?.county;
  if (!countyUrl) return null;
  const m = countyUrl.match(/\/county\/([A-Z]{2}[CZ]\d+)/);
  if (!m) return null;
  const code = m[1];
  if (code.startsWith('NY')) return `36${code.slice(3)}`;
  if (code.startsWith('VT')) return `50${code.slice(3)}`;
  if (code.startsWith('NH')) return `33${code.slice(3)}`;
  if (code.startsWith('ME')) return `23${code.slice(3)}`;
  return null;
}