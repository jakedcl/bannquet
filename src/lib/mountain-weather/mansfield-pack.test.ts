import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseBtvPublicProfile } from '@/lib/mountain-weather/parse/btv-profile';
import { parseMansfieldHydText, parseMansfieldHydXml } from '@/lib/mountain-weather/parse/mansfield-hyd';
import { parseMmnHighchartsSeries } from '@/lib/mountain-weather/parse/mmn-depth';
import { parseNwsStationLatest } from '@/lib/mountain-weather/parse/nws-station-latest';
import { parseRr2MansfieldSummit } from '@/lib/mountain-weather/parse/rr2-mansfield';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('Mansfield HYD XML parses stake row with trace snow', () => {
  const xml = readFileSync(path.join(FIX, 'mansfield-hyd-sample.xml'), 'utf8');
  const parsed = parseMansfieldHydXml(xml);
  assert.equal(parsed.row.station, 'Mount Mansfield');
  assert.equal(parsed.row.snowNew, 'T');
});

test('IEM HYDBTV archive parses winter snow depth on Mansfield', () => {
  const text = readFileSync(path.join(FIX, 'mansfield-hyd-iem-2026-02-10.txt'), 'utf8');
  const parsed = parseMansfieldHydText(text);
  assert.equal(parsed.row.snowTotal, '71');
  assert.equal(parsed.row.tempMax, '24');
});

test('public profile includes KMMN and derived lapse metrics', () => {
  const xml = readFileSync(path.join(FIX, 'mansfield-profile-sample.xml'), 'utf8');
  const parsed = parseBtvPublicProfile(xml);
  const summit = parsed.stations.find((s) => s.id === 'KMMN');
  assert.ok(summit);
  assert.equal(summit.elevationFt, 3950);
  assert.ok(parsed.lapse);
});

test('mmn avgdepth series has year of points', () => {
  const text = readFileSync(path.join(FIX, 'mansfield-avgdepth-sample.xml'), 'utf8');
  const series = parseMmnHighchartsSeries(text);
  assert.ok(series.length >= 360);
  assert.equal(series[0].depthIn, 0);
});

test('RR2 BTV sample extracts MMNV1 summit temperature', () => {
  const text = readFileSync(path.join(FIX, 'mansfield-rr2-sample.txt'), 'utf8');
  const parsed = parseRr2MansfieldSummit(text);
  assert.ok(parsed);
  assert.equal(parsed.summitTempF, 20.5);
  assert.ok(parsed.shefFields.some((f) => f.code === 'DH2118'));
  assert.ok(parsed.shefFields.some((f) => f.code === 'TAIRGZZ' && f.value === '20.5'));
});

test('MMNV1 latest JSON parses without throwing', () => {
  const json = readFileSync(path.join(FIX, 'mansfield-mmnv1-latest.json'), 'utf8');
  const parsed = parseNwsStationLatest(json);
  assert.equal(parsed.stationId, 'MMNV1');
  const failed = parsed.fields.filter((f) => f.qcFailed);
  assert.ok(failed.length > 0);
});

test('Mansfield HYD fixture includes column header lines', () => {
  const xml = readFileSync(path.join(FIX, 'mansfield-hyd-sample.xml'), 'utf8');
  const parsed = parseMansfieldHydXml(xml);
  assert.ok(parsed.headerLines.some((l) => l.startsWith('Station')));
});
