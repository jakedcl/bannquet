import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseNohrscStationSnowText } from '@/lib/mountain-weather/parse/nohrsc-stations';
import { parsePnsSnowReports } from '@/lib/mountain-weather/parse/pns';
import { snowMeasuredBindingsForPlace } from '@/lib/mountain-weather/snow-measured-bindings';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('NOHRSC pipe table parses KMWN snow depth', () => {
  const sample =
    'Station_Id|Name|Latitude|Longitude|Elevation|Physical_Element|DateTime_Report(UTC)|Amount|Units|Zip_Code|\n' +
    'KMWN|MOUNT WASHINGTON|44.26666|-71.30000|5627 feet|snowdepth|2026-11-14 00|4.000|in|00176|';
  const rows = parseNohrscStationSnowText(sample);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stationId, 'KMWN');
  assert.equal(rows[0].amountIn, 4);
  assert.equal(rows[0].element, 'snowdepth');
});

test('PNS parser extracts precipitation rows when snow parsing is mixed', () => {
  const text = readFileSync(path.join(FIX, 'pns-aly-sample.txt'), 'utf8');
  const parsed = parsePnsSnowReports(text, 'ALY', 'test', '2026-11-13T19:24:00+00:00');
  assert.ok(parsed.fullText.length > 100);
  assert.ok(parsed.parsedLines.length >= 1);
});

test('mount marcy has nearest measured snow bindings', () => {
  const b = snowMeasuredBindingsForPlace('mount-marcy');
  assert.ok(b.length >= 1);
  assert.ok(b.every((row) => row.distanceMi <= 40));
});