import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import test from 'node:test';
import { trackStats, type TrackPoint } from '@/lib/gpx';
import { decodeTerrariumPng } from '@/lib/terrain/decode-terrarium';
import {
  densifyLine,
  parseLineStringWkt,
  resampleLine,
  smoothElevations,
  TERRAIN_ELEV_SPACING_M,
} from '@/lib/terrain/elev-from-line';

test('parseLineStringWkt reads lng lat pairs from PostGIS text', () => {
  const coords = parseLineStringWkt('SRID=4326;LINESTRING(-73.95 44.15,-73.94 44.16,-73.93 44.17)');
  assert.equal(coords.length, 3);
  assert.deepEqual(coords[0], { lng: -73.95, lat: 44.15 });
  assert.deepEqual(coords[2], { lng: -73.93, lat: 44.17 });
});

test('densifyLine adds vertices at roughly the requested spacing', () => {
  const line = parseLineStringWkt('LINESTRING(-74 44,-74 44.01)');
  const dense = densifyLine(line, 1_000, 50);
  assert.ok(dense.length >= 3 && dense.length <= 12, `points ${dense.length}`);
  assert.deepEqual(dense[0], line[0]);
  assert.deepEqual(dense[dense.length - 1], line[line.length - 1]);
  assert.equal(TERRAIN_ELEV_SPACING_M, 25);
});

test('decodeTerrariumPng reads a flat 256×256 tile', () => {
  const width = 256;
  const height = 256;
  const channels = 3;
  const raw = Buffer.alloc(height * (1 + width * channels));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < width * channels; x += channels) {
      raw[offset] = 128;
      raw[offset + 1] = 0;
      raw[offset + 2] = 0;
      offset += channels;
    }
  }
  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const heights = decodeTerrariumPng(png);
  assert.equal(heights.length, width * height);
  assert.equal(heights[0], 0);
});

test('terrain gain reuses the 2 m hysteresis from trackStats', () => {
  const points: TrackPoint[] = [];
  for (let step = 0; step <= 40; step += 1) {
    points.push({ lat: 44, lng: -74, ele: 1_000 + step * 0.5 });
  }
  assert.equal(trackStats(points).elevGainM, 20);
});

test('resampleLine keeps the full route when the input is already dense', () => {
  const dense = Array.from({ length: 5_000 }, (_, index) => ({
    lat: 44 + index * 0.00001,
    lng: -74,
  }));
  const samples = resampleLine(dense, 25, 12_000);
  assert.deepEqual(samples[0], dense[0]);
  assert.deepEqual(samples[samples.length - 1], dense[dense.length - 1]);
  assert.ok(samples.length > 100, `samples ${samples.length}`);
});

test('smoothElevations blends neighbors without changing endpoints much', () => {
  const points: TrackPoint[] = [
    { lat: 44, lng: -74, ele: 100 },
    { lat: 44, lng: -74, ele: 110 },
    { lat: 44, lng: -74, ele: 100 },
  ];
  const smoothed = smoothElevations(points, 3);
  assert.ok(smoothed[1]?.ele != null && Math.abs((smoothed[1]?.ele ?? 0) - 103.333) < 0.01);
});