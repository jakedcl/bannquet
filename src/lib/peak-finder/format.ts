import { wrap180, wrap360 } from './geo';

const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

export function formatFeet(meters: number): string {
  const feet = Math.round(meters * 3.280839895);
  return `${feet.toLocaleString('en-US')} ft`;
}

export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  const digits = miles < 10 ? 1 : 0;
  return `${miles.toFixed(digits)} mi`;
}

/** "NNE 23°" */
export function formatDirection(bearing: number): string {
  const wrapped = wrap360(bearing);
  const name = COMPASS_16[Math.round(wrapped / 22.5) % 16];
  return `${name} ${Math.round(wrapped)}°`;
}

const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Label for a tick that lands on a cardinal or intercardinal. */
export function cardinalLabel(bearing: number): string {
  const wrapped = wrap360(bearing);
  const slot = Math.round(wrapped / 45) % 8;
  if (Math.abs(wrap180(wrapped - slot * 45)) > 0.6) return '';
  return COMPASS_8[slot];
}
