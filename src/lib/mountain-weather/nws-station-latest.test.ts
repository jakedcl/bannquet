import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseNwsStationLatest } from '@/lib/mountain-weather/parse/nws-station-latest';
import { formatStationFieldDisplay, stationHasReadableMeasurements } from '@/lib/mountain-weather/parse/nws-station-units';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('JSON-LD station latest (no properties wrapper) parses KSLK', () => {
  const json = readFileSync(path.join(FIX, 'kslk-latest-ld.json'), 'utf8');
  const parsed = parseNwsStationLatest(json);
  assert.equal(parsed.stationId, 'KSLK');
  assert.ok(stationHasReadableMeasurements(parsed.fields));
  const vis = parsed.fields.find((f) => f.key === 'visibility');
  assert.ok(vis?.value !== null);
  assert.match(formatStationFieldDisplay(vis!), /mi$/);
});

test('GeoJSON station latest (MMNV1 fixture) still parses', () => {
  const json = readFileSync(path.join(FIX, 'mansfield-mmnv1-latest.json'), 'utf8');
  const parsed = parseNwsStationLatest(json);
  assert.equal(parsed.stationId, 'MMNV1');
});