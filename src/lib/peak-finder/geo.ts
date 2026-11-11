import { EARTH_RADIUS_M, REFRACTION_K } from './constants';

const DEG = Math.PI / 180;

export function wrap360(deg: number): number {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function wrap180(deg: number): number {
  const wrapped = wrap360(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** Great-circle distance in metres. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * DEG;
  const φ2 = lat2 * DEG;
  const Δφ = (lat2 - lat1) * DEG;
  const Δλ = (lng2 - lng1) * DEG;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing in degrees clockwise from true north. */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * DEG;
  const φ2 = lat2 * DEG;
  const Δλ = (lng2 - lng1) * DEG;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return wrap360(Math.atan2(y, x) / DEG);
}

/** Point reached by walking `distanceM` metres on `bearingDeg` from the start. */
export function destination(lat: number, lng: number, bearing: number, distance: number): { lat: number; lng: number } {
  const δ = distance / EARTH_RADIUS_M;
  const θ = bearing * DEG;
  const φ1 = lat * DEG;
  const λ1 = lng * DEG;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return { lat: φ2 / DEG, lng: ((λ2 / DEG + 540) % 360) - 180 };
}

/**
 * How far the ground drops below a straight line, in metres.
 * Pass k = 0 for curvature alone. The default k = 0.13 puts a little of that drop back (refraction).
 */
export function curvatureDropM(distance: number, k = REFRACTION_K): number {
  return (distance * distance) / (2 * EARTH_RADIUS_M) * (1 - k);
}

/** Apparent elevation angle of a point, in degrees above the horizontal. */
export function apparentElevationDeg(heightM: number, eyeM: number, distance: number, k = REFRACTION_K): number {
  if (distance <= 1) return heightM >= eyeM ? 90 : -90;
  const rise = heightM - eyeM - curvatureDropM(distance, k);
  return Math.atan(rise / distance) / DEG;
}

export function angularDistance(a: number, b: number): number {
  return Math.abs(wrap180(a - b));
}
