import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseAllLocationsXml } from '@/lib/mountain-weather/parse/all-locations';
import { parseRecBulletin, pickRecSection } from '@/lib/mountain-weather/parse/rec';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';
import { gridWeatherAtInstant, formatGridWeatherLayer } from '@/lib/grid-series';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('REC parser finds BTV Northern Adirondacks section', () => {
  const text = readFileSync(path.join(FIX, 'rec-btv-sample.txt'), 'utf8');
  const bulletin = parseRecBulletin(text, '2026-11-13T18:23:00+00:00', 'test');
  const section = pickRecSection(bulletin, 'Northern Adirondacks of New York');
  assert.ok(section);
  assert.ok(section.periods.some((p) => p.name.includes('TONIGHT')));
});

test('REC parser finds BTV Northern Green and Southern Green bands in split bulletin', () => {
  const text = readFileSync(path.join(FIX, 'rec-btv-sample.txt'), 'utf8');
  const bulletin = parseRecBulletin(text, '2026-11-13T18:23:00+00:00', 'test');
  const northern = pickRecSection(bulletin, 'Northern Green Mountains of Vermont');
  assert.ok(northern);
  const southern = pickRecSection(bulletin, 'Southern Green Mountains of Vermont');
  assert.ok(southern);
  assert.ok(southern.theTitle?.includes('Southern Green'));
});

test('REC parser finds GYX summits above 4000 in embedded sample', () => {
  const text = `
MEZ007>009-NHZ002>004-140900-
Summits Above 4000 Feet in Northern New Hampshire and Western Maine-
140 PM EST Fri Nov 13 2026

...Recreation forecast for summits above 4000 feet in northern New
Hampshire and western Maine...

.TONIGHT...Summits obscured. Lows in the mid 20s.
$$
`;
  const bulletin = parseRecBulletin(text, null, null);
  const section = pickRecSection(bulletin, 'Summits Above 4000 Feet');
  assert.ok(section);
  assert.match(section.periods[0].text, /mid 20s/);
});

test('REC CAR archive fixture includes Katahdin summit block', () => {
  const text = readFileSync(path.join(FIX, 'rec-car-2026-02-01.txt'), 'utf8');
  const bulletin = parseRecBulletin(text, '2026-02-01T12:00:00+00:00', 'archive');
  const section = pickRecSection(bulletin, 'TOP OF MOUNT KATAHDIN');
  assert.ok(section, 'expected Katahdin summit section in Feb archive');
});

test('allLocations seasonal-off marks lake markers', () => {
  const xml = readFileSync(path.join(FIX, 'gyx-alllocations-lake-off.xml'), 'utf8');
  const parsed = parseAllLocationsXml(xml);
  const harbor = parsed['CENTER HARBOR'];
  assert.ok(harbor?.seasonalOff);
  assert.match(defaultResumeHint('Lake'), /summer/i);
});

test('grid weather layer formats coverage, type and intensity', () => {
  const layer = {
    coverage: 'chance',
    weather: 'snow_showers',
    intensity: 'light',
  };
  assert.equal(formatGridWeatherLayer(layer), 'chance snow showers light');
  const instant = gridWeatherAtInstant(
    {
      values: [
        {
          validTime: '2026-11-14T07:00:00+00:00/PT2H',
          value: [layer],
        },
      ],
    },
    '2026-11-14T07:00:00+00:00',
  );
  assert.equal(instant?.weather, 'snow_showers');
});
