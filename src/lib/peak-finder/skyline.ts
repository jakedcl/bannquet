import { apparentElevationDeg, destination } from './geo';
import { MAX_DISTANCE_M, RAY_STEP_DEG } from './constants';

export type HeightAt = (lat: number, lng: number, distanceM: number) => number;

export type RayProfile = {
  bearingDeg: number;
  distanceM: Float32Array;
  angleDeg: Float32Array;
  count: number;
  skylineIndex: number;
};

export type Skyline = {
  stepDeg: number;
  rays: RayProfile[];
};

const BANDS: readonly [number, number][] = [
  [10_000, 80],
  [50_000, 200],
  [100_000, 400],
  [MAX_DISTANCE_M, 800],
];

export function sampleDistances(maxM = MAX_DISTANCE_M): number[] {
  const out: number[] = [];
  let d = 40;
  for (const [to, step] of BANDS) {
    const limit = Math.min(to, maxM);
    while (d <= limit) {
      out.push(d);
      d += step;
    }
  }
  return out;
}

export function castRay(
  lat: number,
  lng: number,
  eyeM: number,
  bearing: number,
  heightAt: HeightAt,
  distances: readonly number[],
): RayProfile {
  const distanceM = new Float32Array(distances.length);
  const angleDeg = new Float32Array(distances.length);
  let skylineIndex = 0;
  let count = 0;
  for (const distance of distances) {
    const point = destination(lat, lng, bearing, distance);
    const height = heightAt(point.lat, point.lng, distance);
    const angle = apparentElevationDeg(height, eyeM, distance);
    distanceM[count] = distance;
    angleDeg[count] = angle;
    if (angle > angleDeg[skylineIndex]) skylineIndex = count;
    count += 1;
  }
  return { bearingDeg: bearing, distanceM, angleDeg, count, skylineIndex };
}

export function castSkyline(
  lat: number,
  lng: number,
  eyeM: number,
  heightAt: HeightAt,
  stepDeg = RAY_STEP_DEG,
): Skyline {
  const distances = sampleDistances();
  const rays: RayProfile[] = [];
  const steps = Math.round(360 / stepDeg);
  for (let i = 0; i < steps; i += 1) {
    rays.push(castRay(lat, lng, eyeM, i * stepDeg, heightAt, distances));
  }
  return { stepDeg, rays };
}

export function rayAt(skyline: Skyline, bearing: number): RayProfile {
  const steps = skyline.rays.length;
  const index = Math.round((bearing % 360 + 360) % 360 / skyline.stepDeg) % steps;
  return skyline.rays[index];
}

export function skylineAngle(ray: RayProfile): number {
  return ray.angleDeg[ray.skylineIndex] ?? -90;
}

export function skylineDistance(ray: RayProfile): number {
  return ray.distanceM[ray.skylineIndex] ?? 0;
}

/** Highest apparent angle of terrain strictly past `distanceM`. */
export function angleBeyond(ray: RayProfile, distance: number): number {
  let best = -90;
  let found = false;
  for (let i = 0; i < ray.count; i += 1) {
    if (ray.distanceM[i] <= distance + 30) continue;
    found = true;
    if (ray.angleDeg[i] > best) best = ray.angleDeg[i];
  }
  return found ? best : -89;
}

export type Ridge = { distanceM: number; angleDeg: number };

/** Local high points along a ray, farthest first, plus the skyline if it isn't already there. */
export function ridgesOnRay(ray: RayProfile, limit = 4): Ridge[] {
  const hits: Ridge[] = [];
  for (let i = 1; i < ray.count - 1; i += 1) {
    const angle = ray.angleDeg[i];
    if (angle < ray.angleDeg[i - 1] || angle <= ray.angleDeg[i + 1]) continue;
    const left = Math.min(ray.angleDeg[Math.max(0, i - 3)], ray.angleDeg[i - 1]);
    const right = Math.min(ray.angleDeg[Math.min(ray.count - 1, i + 3)], ray.angleDeg[i + 1]);
    if (angle - Math.min(left, right) < 0.12 && i !== ray.skylineIndex) continue;
    hits.push({ distanceM: ray.distanceM[i], angleDeg: angle });
  }
  const sky = { distanceM: skylineDistance(ray), angleDeg: skylineAngle(ray) };
  if (!hits.some((hit) => Math.abs(hit.distanceM - sky.distanceM) < 50)) hits.push(sky);
  hits.sort((a, b) => b.distanceM - a.distanceM);
  const kept: Ridge[] = [];
  for (const hit of hits) {
    if (kept.some((other) => Math.abs(other.distanceM - hit.distanceM) < 1_500)) continue;
    kept.push(hit);
    if (kept.length >= limit) break;
  }
  return kept;
}
