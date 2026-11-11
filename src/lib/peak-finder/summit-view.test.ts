import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import test from 'node:test';
import { DEFAULT_HFOV_DEG, RAY_STEP_DEG } from './constants';
import { labelsInView } from './declutter';
import { bearingDeg, distanceM, wrap180 } from './geo';
import type { Peak } from './peaks';
import { angleBefore, castSkyline, rayAt, skylineAngle, skylineDistance, viewProfile } from './skyline';
import { sampleHeight, terrainTiles, terrariumHeight, terrariumUrl, type TileId } from './tiles';
import { burialM, eyeHeightM, raiseSummit, visiblePeaks } from './visibility';

type ListedPeak = Peak & { elevationM: number };

function paeth(left: number, up: number, upLeft: number): number {
  const guess = left + up - upLeft;
  const leftDiff = Math.abs(guess - left);
  const upDiff = Math.abs(guess - up);
  const diagDiff = Math.abs(guess - upLeft);
  if (leftDiff <= upDiff && leftDiff <= diagDiff) return left;
  if (upDiff <= diagDiff) return up;
  return upLeft;
}

function decodeTerrariumPng(buf: Buffer): Float32Array {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 2;
  const parts: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || (colorType !== 2 && colorType !== 6)) throw new Error(`Unexpected terrain PNG ${data[8]}/${colorType}`);
    } else if (type === 'IDAT') parts.push(Buffer.from(data));
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const inflated = inflateSync(Buffer.concat(parts));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src];
    src += 1;
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const byte = inflated[src];
      src += 1;
      const left = x >= channels ? raw[row + x - channels] : 0;
      const up = y > 0 ? raw[row - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? raw[row - stride + x - channels] : 0;
      let value = byte;
      if (filter === 1) value = (byte + left) & 255;
      else if (filter === 2) value = (byte + up) & 255;
      else if (filter === 3) value = (byte + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (byte + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`PNG filter ${filter}`);
      raw[row + x] = value;
    }
  }
  const heights = new Float32Array(width * height);
  for (let i = 0; i < heights.length; i += 1) {
    const pixel = i * channels;
    heights[i] = terrariumHeight(raw[pixel], raw[pixel + 1], raw[pixel + 2]);
  }
  return heights;
}

async function loadGrids(lat: number, lng: number): Promise<Map<string, Float32Array>> {
  const cache = '/tmp/pf-summit-tiles';
  mkdirSync(cache, { recursive: true });
  const grids = new Map<string, Float32Array>();
  const tiles = terrainTiles(lat, lng);
  let cursor = 0;
  async function worker() {
    while (cursor < tiles.length) {
      const index = cursor;
      cursor += 1;
      const tile: TileId = tiles[index];
      const file = `${cache}/${tile.z}-${tile.x}-${tile.y}.png`;
      if (!existsSync(file)) {
        const response = await fetch(terrariumUrl(tile));
        if (!response.ok) throw new Error(`Tile ${tile.z}/${tile.x}/${tile.y} failed`);
        writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      }
      grids.set(`${tile.z}/${tile.x}/${tile.y}`, decodeTerrariumPng(readFileSync(file)));
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return grids;
}

function readPeaks(file: URL): ListedPeak[] {
  const data = JSON.parse(readFileSync(fileURLToPath(file), 'utf8')) as { peaks: { name: string; lat: number; lng: number; elevationFt: number }[] };
  return data.peaks.map((peak) => ({
    name: peak.name,
    lat: peak.lat,
    lng: peak.lng,
    elevationM: peak.elevationFt / 3.280839895,
  }));
}

function report(origin: { lat: number; lng: number }, peaks: readonly ListedPeak[], grids: Map<string, Float32Array>) {
  const sample = (lat: number, lng: number, metres: number) => sampleHeight(grids, lat, lng, metres);
  const eyeM = eyeHeightM(origin.lat, origin.lng, (lat, lng) => sample(lat, lng, 0));
  const skyline = castSkyline(origin.lat, origin.lng, eyeM, (lat, lng, metres) => sample(lat, lng, metres) ?? 0, RAY_STEP_DEG);
  const raised = peaks.flatMap((peak) => {
    const metres = distanceM(origin.lat, origin.lng, peak.lat, peak.lng);
    const next = raiseSummit(peak, (lat, lng) => sample(lat, lng, metres));
    return next ? [next] : [];
  });
  const visible = visiblePeaks(origin.lat, origin.lng, eyeM, raised, skyline);
  const names = new Set(visible.map((peak) => peak.name));
  const hidden = raised
    .filter((peak) => !names.has(peak.name))
    .map((peak) => {
      const metres = distanceM(origin.lat, origin.lng, peak.lat, peak.lng);
      const occluder = angleBefore(rayAt(skyline, bearingDeg(origin.lat, origin.lng, peak.lat, peak.lng)), metres);
      return { name: peak.name, buried: burialM(occluder, metres, eyeM, peak.elevationM) };
    })
    .sort((a, b) => a.buried - b.buried);
  return { eyeM, visible, hidden };
}

const MARCY_SUMMIT = { lat: 44.112857, lng: -73.923784 };
const COLDEN_SUMMIT = { lat: 44.126996, lng: -73.960092 };
const LOWER_AUSABLE = { lat: 44.112, lng: -73.852 };
const WASHINGTON = { lat: 44.2705, lng: -71.30325 };
const DEFAULT_WIDTH = 980;
const DEFAULT_HEIGHT = 720;

function assertFrontRidgeView(
  origin: { lat: number; lng: number },
  peaks: readonly ListedPeak[],
  grids: Map<string, Float32Array>,
  wanted: readonly string[],
) {
  const sample = (lat: number, lng: number, metres: number) => sampleHeight(grids, lat, lng, metres);
  const eyeM = eyeHeightM(origin.lat, origin.lng, (lat, lng) => sample(lat, lng, 0));
  const skyline = castSkyline(origin.lat, origin.lng, eyeM, (lat, lng, metres) => sample(lat, lng, metres) ?? 0, RAY_STEP_DEG);
  const view = viewProfile(skyline);
  let frontSamples = 0;
  const countBandPoint = (angle: number, distance: number, index: number) => {
    if (!Number.isFinite(angle) || !Number.isFinite(distance)) return;
    const bearing = index * skyline.stepDeg;
    if (Math.abs(wrap180(bearing - 270)) > DEFAULT_HFOV_DEG / 2) return;
    const sky = skyline.rays[index].angleDeg[skyline.rays[index].skylineIndex];
    if (sky - angle >= 0.4) frontSamples += 1;
  };
  for (const layer of view.layers) {
    layer.angleDeg.forEach((angle, index) => countBandPoint(angle, layer.distanceM[index], index));
    layer.hiddenAngleDeg.forEach((angle, index) => countBandPoint(angle, layer.hiddenDistanceM[index], index));
  }
  assert.ok(frontSamples > 30, `front ridge samples in the west view: ${frontSamples}`);
  const raised = peaks.flatMap((peak) => {
    const metres = distanceM(origin.lat, origin.lng, peak.lat, peak.lng);
    const next = raiseSummit(peak, (lat, lng) => sample(lat, lng, metres));
    return next ? [next] : [];
  });
  const visible = visiblePeaks(origin.lat, origin.lng, eyeM, raised, skyline);
  const labels = labelsInView(visible, {
    heading: 270,
    pitch: 0,
    roll: 0,
    hfov: DEFAULT_HFOV_DEG,
  }, DEFAULT_WIDTH, DEFAULT_HEIGHT);
  const labeled = new Set(labels.map((peak) => peak.name));
  const inWindow = visible.filter((peak) => Math.abs(wrap180(peak.bearingDeg - 270)) <= DEFAULT_HFOV_DEG / 2);
  const front = inWindow.filter((peak) => {
    const ray = rayAt(skyline, peak.bearingDeg);
    const sky = ray.angleDeg[ray.skylineIndex];
    return sky - peak.angleDeg >= 0.35;
  });
  const missing = wanted.filter((name) => !labeled.has(name));
  const frontMissing = front.filter((peak) => wanted.includes(peak.name) && !labeled.has(peak.name));
  assert.equal(missing.length, 0, `unlabeled at default zoom: ${missing.join(', ')}; labeled ${[...labeled].join(', ')}`);
  assert.equal(frontMissing.length, 0, `front ridge unlabeled: ${frontMissing.map((peak) => peak.name).join(', ')}`);
}

const MARCY_SEES = [
  'Algonquin Peak',
  'Iroquois Peak',
  'Wright Peak',
  'Mount Colden',
  'Gray Peak',
  'Mount Skylight',
  'Mount Haystack',
  'Basin Mountain',
  'Gothics',
  'Giant Mountain',
  'Dix Mountain',
  'Whiteface Mountain',
  'Santanoni Peak',
  'Cascade Mountain',
  'Nippletop',
];

test('from Marcy, the High Peaks in view are labeled and Couchsachraga stays hidden', async () => {
  const peaks = readPeaks(new URL('../../../config/challenges/adk46.json', import.meta.url));
  const others = peaks.filter((peak) => peak.name !== 'Mount Marcy');
  const { visible, hidden, eyeM } = report(MARCY_SUMMIT, others, await loadGrids(MARCY_SUMMIT.lat, MARCY_SUMMIT.lng));
  const names = new Set(visible.map((peak) => peak.name));
  const missing = MARCY_SEES.filter((name) => !names.has(name));
  const hiddenText = hidden.map((peak) => `${peak.name} ${Math.round(peak.buried)}m`).join(', ');
  assert.equal(missing.length, 0, `missing ${missing.join(', ')}; eye ${eyeM.toFixed(0)}; hidden ${hiddenText}`);
  assert.equal(names.has('Couchsachraga Peak'), false, `Couchsachraga was labeled; hidden ${hiddenText}`);
  assert.ok(names.size >= 40, `only ${names.size} of 45 other High Peaks: ${[...names].sort().join(', ')}`);
});

test('from Mount Colden, Marcy\'s ridgeline shapes the skyline toward Marcy', async () => {
  const grids = await loadGrids(COLDEN_SUMMIT.lat, COLDEN_SUMMIT.lng);
  const sample = (lat: number, lng: number, metres: number) => sampleHeight(grids, lat, lng, metres);
  const eyeM = eyeHeightM(COLDEN_SUMMIT.lat, COLDEN_SUMMIT.lng, (lat, lng) => sample(lat, lng, 0));
  const skyline = castSkyline(
    COLDEN_SUMMIT.lat,
    COLDEN_SUMMIT.lng,
    eyeM,
    (lat, lng, metres) => sample(lat, lng, metres) ?? 0,
    RAY_STEP_DEG,
  );
  const marcyBearing = bearingDeg(COLDEN_SUMMIT.lat, COLDEN_SUMMIT.lng, MARCY_SUMMIT.lat, MARCY_SUMMIT.lng);
  const ray = rayAt(skyline, marcyBearing);
  const horizon = skylineAngle(ray);
  const metres = skylineDistance(ray);
  const view = viewProfile(skyline);
  const index = Math.round((marcyBearing % 360 + 360) % 360 / skyline.stepDeg) % skyline.rays.length;
  assert.ok(horizon > 2, `horizon toward Marcy ${horizon.toFixed(2)}°`);
  assert.ok(metres >= 1_500 && metres < 5_000, `defining distance ${Math.round(metres)} m`);
  assert.ok(view.angleDeg[index] > 1.5, `drawn toward Marcy ${view.angleDeg[index].toFixed(2)}°`);
  for (const layer of view.layers) {
    if (Number.isFinite(layer.angleDeg[index])) {
      assert.ok(!Number.isFinite(layer.hiddenAngleDeg[index]), 'visible band toward Marcy stays solid');
      assert.ok(layer.angleDeg[index] > 0.5, `solid layer toward Marcy ${layer.angleDeg[index].toFixed(2)}°`);
    }
  }
});

test('front ridges are drawn and labeled at default zoom from Marcy and Lower Ausable Lake', async () => {
  const peaks = readPeaks(new URL('../../../config/challenges/adk46.json', import.meta.url));
  const marcy = await loadGrids(MARCY_SUMMIT.lat, MARCY_SUMMIT.lng);
  assertFrontRidgeView(MARCY_SUMMIT, peaks.filter((peak) => peak.name !== 'Mount Marcy'), marcy, ['Gray Peak', 'Mount Colden', 'Algonquin Peak']);
  const ausable = await loadGrids(LOWER_AUSABLE.lat, LOWER_AUSABLE.lng);
  assertFrontRidgeView(LOWER_AUSABLE, peaks, ausable, ['Mount Haystack', 'Basin Mountain', 'Mount Marcy']);
});

test('from Mount Washington, the neighboring Presidential summits are labeled', async () => {
  const peaks = readPeaks(new URL('../../../config/challenges/nh48.json', import.meta.url));
  const want = ['Mount Adams', 'Mount Jefferson', 'Mount Madison', 'Mount Monroe'];
  const { visible, hidden } = report(WASHINGTON, peaks.filter((peak) => peak.name !== 'Mount Washington'), await loadGrids(WASHINGTON.lat, WASHINGTON.lng));
  const names = new Set(visible.map((peak) => peak.name));
  const missing = want.filter((name) => !names.has(name));
  assert.equal(missing.length, 0, `missing ${missing.join(', ')}; hidden ${hidden.map((peak) => peak.name).join(', ')}`);
});
