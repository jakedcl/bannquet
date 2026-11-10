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

export type DrawnLayer = { angleDeg: number[]; distanceM: number[] };

export type DrawnProfile = {
  angleDeg: number[];
  distanceM: number[];
  layers: DrawnLayer[];
};

/** Closer than this is the ground underfoot. Its bumps are the scribbly hatching, so they are not drawn. */
const RIDGE_START_M = 4_000;

/** One line per band: the highest ground in that range, not every bump along the ray. */
const RIDGE_BANDS: readonly [number, number][] = [
  [RIDGE_START_M, 15_000],
  [15_000, 40_000],
  [40_000, 100_000],
];

const RIDGE_PROMINENCE_DEG = 0.55;
const SKYLINE_GAP_DEG = 0.55;
const LAYER_GAP_DEG = 0.4;
const MIN_RUN_DEG = 6;
/** A line this close to the horizon is the ground, not a ridge. */
const GROUND_ANGLE_DEG = 0.8;
const SKYLINE_SMOOTH_DEG = 0.35;
const LAYER_SMOOTH_DEG = 0.8;

/** Circular when the series wraps the compass. Stops at a gap instead of blending across it. */
export function smoothAngles(values: readonly number[], radius: number, circular: boolean): number[] {
  const count = values.length;
  const sigma = Math.max(0.8, radius / 1.6);
  const weightAt = (offset: number) => Math.exp(-0.5 * (offset / sigma) ** 2);
  return values.map((value, index) => {
    if (!Number.isFinite(value)) return Number.NaN;
    let acc = value * weightAt(0);
    let weight = weightAt(0);
    for (const sign of [-1, 1]) {
      for (let offset = 1; offset <= radius; offset += 1) {
        const raw = index + sign * offset;
        const wrapped = circular ? ((raw % count) + count) % count : raw;
        if (!circular && (wrapped < 0 || wrapped >= count)) break;
        const sample = values[wrapped];
        if (!Number.isFinite(sample)) break;
        const sampleWeight = weightAt(offset);
        acc += sample * sampleWeight;
        weight += sampleWeight;
      }
    }
    return acc / weight;
  });
}

function fillShortGaps(angleDeg: number[], distanceM: number[], stepDeg: number) {
  const maxGap = Math.max(1, Math.round(1.5 / stepDeg));
  const count = angleDeg.length;
  const angles = angleDeg.slice();
  const distances = distanceM.slice();
  let index = 0;
  while (index < count) {
    if (Number.isFinite(angles[index])) {
      index += 1;
      continue;
    }
    let gap = 0;
    while (gap < count && !Number.isFinite(angles[(index + gap) % count])) gap += 1;
    const left = angles[(index - 1 + count) % count];
    const right = angles[(index + gap) % count];
    const leftDistance = distances[(index - 1 + count) % count];
    const rightDistance = distances[(index + gap) % count];
    if (
      gap <= maxGap
      && gap < count
      && Number.isFinite(left)
      && Number.isFinite(right)
      && Math.abs(left - right) < 1
      && Number.isFinite(leftDistance)
      && Number.isFinite(rightDistance)
    ) {
      for (let step = 0; step < gap; step += 1) {
        const t = (step + 1) / (gap + 1);
        const at = (index + step) % count;
        angleDeg[at] = left + (right - left) * t;
        distanceM[at] = leftDistance + (rightDistance - leftDistance) * t;
      }
    }
    index += gap;
  }
}

function dropShortRuns(angleDeg: number[], distanceM: number[], stepDeg: number) {
  const minRun = Math.max(3, Math.round(MIN_RUN_DEG / stepDeg));
  const count = angleDeg.length;
  if (angleDeg.every((value) => Number.isFinite(value))) return;
  const clear = (start: number, length: number) => {
    if (length >= minRun) return;
    for (let step = 0; step < length; step += 1) {
      const index = (start + step) % count;
      angleDeg[index] = Number.NaN;
      distanceM[index] = Number.NaN;
    }
  };
  let start = 0;
  while (start < count && Number.isFinite(angleDeg[start])) start += 1;
  if (start === count) return;
  let index = (start + 1) % count;
  const origin = index;
  do {
    if (!Number.isFinite(angleDeg[index])) {
      index = (index + 1) % count;
      continue;
    }
    let length = 0;
    while (length < count && Number.isFinite(angleDeg[(index + length) % count])) length += 1;
    clear(index, length);
    index = (index + length) % count;
  } while (index !== origin);
}

function bandLayer(skyline: Skyline, min: number, max: number): DrawnLayer {
  const angleDeg = skyline.rays.map(() => Number.NaN);
  const distanceM = skyline.rays.map(() => Number.NaN);
  skyline.rays.forEach((ray, index) => {
    let best = -90;
    let worst = 90;
    let bestDistance = 0;
    let seen = false;
    for (let i = 0; i < ray.count; i += 1) {
      const distance = ray.distanceM[i];
      if (distance < min || distance >= max) continue;
      const angle = ray.angleDeg[i];
      seen = true;
      if (angle > best) {
        best = angle;
        bestDistance = distance;
      }
      if (angle < worst) worst = angle;
    }
    if (!seen || best - worst < RIDGE_PROMINENCE_DEG) return;
    if (skylineAngle(ray) - best < SKYLINE_GAP_DEG) return;
    angleDeg[index] = best;
    distanceM[index] = bestDistance;
  });
  return { angleDeg, distanceM };
}

/**
 * What the canvas draws. The skyline is smoothed so pixel steps round off.
 * Extra lines are at most one per distance band, and only where that band is a
 * real ridge sitting clearly below the skyline. Nothing inside 4 km is drawn.
 */
export function viewProfile(skyline: Skyline): DrawnProfile {
  const smoothRadius = Math.max(1, Math.round(SKYLINE_SMOOTH_DEG / skyline.stepDeg));
  const angleDeg = smoothAngles(skyline.rays.map((ray) => skylineAngle(ray)), smoothRadius, true);
  const distanceM = skyline.rays.map((ray) => skylineDistance(ray));
  const layerRadius = Math.max(1, Math.round(LAYER_SMOOTH_DEG / skyline.stepDeg));
  const layers = RIDGE_BANDS.map(([min, max]) => bandLayer(skyline, min, max));
  for (const layer of layers) {
    fillShortGaps(layer.angleDeg, layer.distanceM, skyline.stepDeg);
    layer.angleDeg = smoothAngles(layer.angleDeg, layerRadius, true);
  }
  layers.forEach((layer, index) => {
    layer.angleDeg.forEach((angle, ray) => {
      if (!Number.isFinite(angle) || angleDeg[ray] - angle >= SKYLINE_GAP_DEG) return;
      layer.angleDeg[ray] = Number.NaN;
      layer.distanceM[ray] = Number.NaN;
    });
    for (const nearer of layers.slice(0, index)) {
      layer.angleDeg.forEach((angle, ray) => {
        const other = nearer.angleDeg[ray];
        if (!Number.isFinite(angle) || !Number.isFinite(other) || Math.abs(angle - other) >= LAYER_GAP_DEG) return;
        layer.angleDeg[ray] = Number.NaN;
        layer.distanceM[ray] = Number.NaN;
      });
    }
    dropShortRuns(layer.angleDeg, layer.distanceM, skyline.stepDeg);
  });
  return {
    angleDeg,
    distanceM,
    layers: layers.filter((layer) => {
      const angles = layer.angleDeg.filter((angle) => Number.isFinite(angle));
      if (angles.length === 0) return false;
      const ordered = angles.slice().sort((a, b) => a - b);
      return ordered[Math.floor(ordered.length / 2)] >= GROUND_ANGLE_DEG;
    }).reverse(),
  };
}
