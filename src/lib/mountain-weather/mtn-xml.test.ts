import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMtnEnhancedXml, parseMtnStandardXml } from '@/lib/mountain-weather/parse/mtn-xml';
import { mtnPointRefForPlace } from '@/lib/mountain-weather/mtn-point-map';

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
SNOW AMT (IN)     0     0
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
<SNOW>0,0</SNOW>
<ICE>0,0</ICE>
</MARKER>
</MARKERS>`;

test('standard XML parses Marcy narratives and table', () => {
  const parsed = parseMtnStandardXml(FIXTURE);
  const marcy = parsed['MOUNT MARCY'];
  assert.ok(marcy);
  assert.equal(marcy.narratives.length, 1);
  assert.equal(marcy.tabular.length, 3);
  assert.equal(marcy.tabular[0].tempF, 17);
  assert.equal(marcy.tabular[2].sky, 'In and out of clouds');
});

test('enhanced XML parses hourly BTV fields including gust', () => {
  const parsed = parseMtnEnhancedXml(ENHANCED_FIXTURE, 'BTV');
  const marcy = parsed['MOUNT MARCY'];
  assert.ok(marcy);
  assert.equal(marcy.hourly.length, 3);
  assert.equal(marcy.hourly[1].gustMph, 20);
  assert.equal(marcy.hourly[0].sky, 'In and out of clouds');
  assert.ok(marcy.cycleStart);
  assert.equal(marcy.cycleStart.getMonth(), 10);
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
