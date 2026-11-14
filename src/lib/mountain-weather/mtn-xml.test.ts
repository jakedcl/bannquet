import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMtnEnhancedXml, parseMtnStandardXml } from '@/lib/mountain-weather/parse/mtn-xml';
import { buildMtnDisplay } from '@/lib/mountain-weather/mtn-display';
import { mtnPointRefForPlace } from '@/lib/mountain-weather/mtn-point-map';

const FIXTURE_DIR = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<MARKERS>
<MARKER>
<LAT>44.112500</LAT>
<LON>-73.923889</LON>
<LOCATION>MOUNT MARCY</LOCATION>
<TEXT>The forecast for Mount Marcy, New York at 5,344 ft:
Last Updated at 123 PM EST Fri Nov 13 2026

.TONIGHT...Summits in and out of clouds. Lows around 15.

Detailed Forecast Data:

DATE                   Sat 11/14/26
TIME (EST)       18 21 00
TEMP (F)         17 16 15
WIND DIR          N  N  N
WIND SPD (MPH)   12 16 16
WIND GST (MPH)   18 20 20
SKY COVER (%)    IO IO IO
WIND CHL (F)      4  1 -1
PROB PRECIP (%)   0  1  9
LIGHTNING RISK   NR NR NR
SNOW AMT (IN)     T     0
ICE ACCUM (IN)    0     0
</TEXT>
</MARKER>
</MARKERS>`;

const ENHANCED_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<MARKERS>
<MARKER>
<LAT>44.112500</LAT>
<LON>-73.923889</LON>
<LOCATION>MOUNT MARCY</LOCATION>
<DATE>2026,10,13,18</DATE>
<TEMP>17,16,15</TEMP>
<WIND>349,339,339</WIND>
<SPEED>12,16,16</SPEED>
<GUST>18,20,20</GUST>
<SKY>101,101,101</SKY>
<CHILL>4,1,-1</CHILL>
<POP>0,1,9</POP>
<SNOW>T,0</SNOW>
<ICE>0,0</ICE>
</MARKER>
</MARKERS>`;

test('standard XML parses Marcy narratives, table rows, trace snow, and elevation', () => {
  const parsed = parseMtnStandardXml(FIXTURE);
  const marcy = parsed['MOUNT MARCY'];
  assert.ok(marcy);
  assert.equal(marcy.elevationFt, 5344);
  assert.equal(marcy.narratives.length, 1);
  assert.equal(marcy.tabular.length, 3);
  assert.equal(marcy.tabular[0].tempF, 17);
  assert.equal(marcy.tabular[0].windChillF, 4);
  assert.equal(marcy.tabular[0].precipPct, 0);
  assert.equal(marcy.tabular[0].sky, 'In and out of clouds');
  assert.equal(marcy.tabular[0].lightning, 'NR');
  assert.equal(marcy.snowBlocks[0], 'T');
});

test('enhanced XML parses hourly BTV fields including gust without inventing zeros', () => {
  const parsed = parseMtnEnhancedXml(ENHANCED_FIXTURE, 'BTV');
  const marcy = parsed['MOUNT MARCY'];
  assert.ok(marcy);
  assert.equal(marcy.hourly.length, 3);
  assert.equal(marcy.hourly[1].gustMph, 20);
  assert.equal(marcy.hourly[0].sky, 'In and out of clouds');
  assert.ok(marcy.cycleStart);
  assert.equal(marcy.snowBlocks[0], 'T');
});

test('enhanced cycle start is ET-labelled when TZ=UTC', () => {
  const prev = process.env.TZ;
  process.env.TZ = 'UTC';
  const parsed = parseMtnEnhancedXml(ENHANCED_FIXTURE, 'BTV');
  if (prev === undefined) delete process.env.TZ;
  else process.env.TZ = prev;
  const start = parsed['MOUNT MARCY']?.cycleStart;
  assert.ok(start);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(start);
  const bag = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  assert.equal(bag.month, '11');
  assert.equal(bag.day, '13');
  assert.equal(Number(bag.hour), 18);
});

test('live BTV standard fixture parses 17-column wind chill and lightning rows', () => {
  const xml = readFileSync(path.join(FIXTURE_DIR, 'btv-standard-marcy-or-hunter.xml'), 'utf8');
  const parsed = parseMtnStandardXml(xml);
  const point = Object.values(parsed)[0];
  assert.ok(point);
  assert.ok(point.tabular.length >= 10);
  assert.equal(point.tabular[0].windChillF !== null || point.tabular[5].windChillF !== null, true);
  assert.equal(point.tabular[0].lightning, 'NR');
  assert.ok(point.snowBlocks.length >= 1);
});

test('ALY enhanced without GUST merges gusts from standard tabular', () => {
  const stdXml = readFileSync(path.join(FIXTURE_DIR, 'aly-standard-marcy-or-hunter.xml'), 'utf8');
  const enhXml = readFileSync(path.join(FIXTURE_DIR, 'aly-enhanced-marcy-or-hunter.xml'), 'utf8');
  const standard = parseMtnStandardXml(stdXml)['HUNTER MOUNTAIN'];
  const enhanced = parseMtnEnhancedXml(enhXml, 'ALY')['HUNTER MOUNTAIN'];
  assert.ok(standard && enhanced);
  assert.equal(enhanced.hourly[0].gustMph, null);
  assert.ok(standard.tabular[0].gustMph !== null);
  const display = buildMtnDisplay({
    loc: 'HUNTER MOUNTAIN',
    office: 'ALY',
    standard,
    enhanced,
  });
  assert.ok(display.meta.showGust);
  assert.equal(display.hourly[0].gustMph, standard.tabular[0].gustMph);
});

test('mtn-points maps 53 places', () => {
  const plan = readFileSync(
    path.resolve(process.cwd(), 'config/mountain-weather/mtn-points.json'),
    'utf8',
  );
  const entries = JSON.parse(plan).points;
  assert.equal(entries.length, 53);
  assert.deepEqual(mtnPointRefForPlace('mount-marcy'), { office: 'BTV', loc: 'MOUNT MARCY' });
  assert.deepEqual(mtnPointRefForPlace('hunter-mountain'), { office: 'ALY', loc: 'HUNTER MOUNTAIN' });
  assert.equal(mtnPointRefForPlace('mount-washington'), null);
});
