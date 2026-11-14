import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import type { PlaceSourceBinding } from '@/lib/mountain-weather/source-bindings';

const bindings = bindingsJson as { places: Record<string, PlaceSourceBinding> };
import { parseAvgBulletin, pickAvgPoint } from '@/lib/mountain-weather/parse/avg';
import { parseAvgToken } from '@/lib/mountain-weather/parse/avg-values';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('AVG token parser keeps nulls for MM and empty gusts', () => {
  assert.equal(parseAvgToken(''), null);
  assert.equal(parseAvgToken('MM'), null);
  assert.equal(parseAvgToken('T'), 'T');
  assert.equal(parseAvgToken('0'), 0);
});

test('BTV winter fixture parses seven distinct point titles', () => {
  const text = readFileSync(path.join(FIX, 'avg-btv-winter-sample.txt'), 'utf8');
  const bulletin = parseAvgBulletin(text, '2026-11-13T21:07:00+00:00', 'test-btv');
  assert.equal(bulletin.points.length, 7);
  const smug = pickAvgPoint(bulletin, 'Smugglers Notch');
  assert.ok(smug);
  assert.equal(smug.elevationFt, 3370);
  assert.ok(smug.grids.length >= 2, 'expected 3-hourly and 6-hourly date grids');
  const hourly = smug.grids[0];
  assert.match(hourly.dateHeading ?? '', /Saturday/i);
  assert.ok(hourly.timeLabels.length >= 10);
  const gust = hourly.rows.find((r) => r.key.includes('wind_gust'));
  assert.ok(gust);
  assert.equal(gust.values.length, 0);
  const ratio = hourly.rows.find((r) => r.key.includes('snow_ratio'));
  assert.ok(ratio);
  assert.ok(ratio.values.some((v) => typeof v === 'number'));
  const sixHour = smug.grids[1];
  assert.match(sixHour.dateHeading ?? '', /Mon 11\/16/i);
  assert.ok(sixHour.rows.some((r) => r.label.includes('12 Hour QPF')));
  assert.ok(sixHour.timeLabels.length >= 10);
});

test('GYX winter fixture includes Washington and Franconia points', () => {
  const text = readFileSync(path.join(FIX, 'avg-gyx-winter-sample.txt'), 'utf8');
  const bulletin = parseAvgBulletin(text, '2026-11-13T20:30:00+00:00', 'test-gyx');
  assert.ok(bulletin.points.length >= 9);
  const wash = pickAvgPoint(bulletin, 'PRESIDENTIAL RANGE FORECAST AREA/MOUNT WASHINGTON');
  assert.ok(wash);
  const fran = pickAvgPoint(bulletin, 'FRANCONIA NOTCH/MOUNT LAFAYETTE');
  assert.ok(fran);
  assert.equal(fran.elevationFt, 4000);
  const snowLevel = wash.grids[0]?.rows.find((r) => r.key.includes('snow_level'));
  assert.ok(snowLevel, 'GYX Washington block should include snow level row when present');
  assert.ok(wash.grids.length >= 1);
});

test('IEM AFOS archive fixture parses Smugglers block', () => {
  const text = readFileSync(path.join(FIX, 'avg-btv-iem-2026-02-10.txt'), 'utf8');
  const bulletin = parseAvgBulletin(text, '2026-02-10T12:00:00+00:00', 'iem');
  assert.ok(bulletin.points.length >= 1);
  assert.ok(pickAvgPoint(bulletin, 'Smugglers Notch'));
});

test('IEM-style off-season bulletin is seasonal-off without points', () => {
  const text = readFileSync(path.join(FIX, 'avg-btv-off-season.txt'), 'utf8');
  const bulletin = parseAvgBulletin(text, '2026-06-01T08:00:00+00:00', 'off');
  assert.equal(bulletin.points.length, 0);
  assert.equal(bulletin.seasonalOff, true);
  assert.match(defaultResumeHint('AVG'), /late fall/i);
});

test('AVG bindings: no VT Monadnock vs NH Monadnock title collision', () => {
  const places = bindings.places;
  const vtMonadnock = places['monadnock-mountain']?.avg;
  const nhMonadnock = places['mount-monadnock']?.avg;
  assert.equal(vtMonadnock, undefined);
  assert.equal(nhMonadnock, undefined);
  const mansfield = places['mount-mansfield']?.avg;
  assert.ok(mansfield && !Array.isArray(mansfield));
  assert.match(mansfield.pointMatch, /Smugglers/i);
  const adams = places['mount-adams']?.avg;
  assert.ok(Array.isArray(adams));
  assert.equal(adams.length, 2);
  assert.match(adams[0].pointMatch, /WASHINGTON/i);
  assert.match(adams[1].pointMatch, /RAVINES/i);
});

test('Washington and Adams pages bind both elevation REC and allLocations bands', () => {
  const wash = bindings.places['mount-washington'];
  const adams = bindings.places['mount-adams'];
  assert.ok(wash?.rec && Array.isArray(wash.rec) && wash.rec.length === 2);
  assert.ok(adams?.rec && Array.isArray(adams.rec) && adams.rec.length === 2);
  assert.ok(wash.rec.some((r) => /4000/.test(r.sectionMatch)));
  assert.ok(wash.rec.some((r) => /2500/.test(r.sectionMatch)));
  assert.ok(wash.allLocations && Array.isArray(wash.allLocations) && wash.allLocations.length === 2);
  assert.ok(adams.allLocations && Array.isArray(adams.allLocations) && adams.allLocations.length === 2);
  assert.ok(wash.allLocations.some((a) => a.loc === 'MOUNT ADAMS' && a.bandLabel?.includes('Mid-elevation')));
  assert.ok(adams.allLocations.some((a) => a.loc === 'MOUNT WASHINGTON'));
});
