/**
 * One-off. Writes the 1° magnetic-declination table for the 50 states and DC.
 *
 *   npx tsx scripts/peak-finder/build-declination.ts \
 *     --zip /path/to/WMM2025COF.zip \
 *     --states /path/to/us-states.json \
 *     --date 2026-11-10 \
 *     --out public/peak-finder/declination.v1.json
 *
 * The zip is NOAA's WMM2025 coefficient package:
 * https://www.ncei.noaa.gov/sites/default/files/2025-01/WMM2025COF.zip
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { declinationDeg, parseWmmCof, parseWmmTests, wmmTestError } from '../../src/lib/peak-finder/wmm';
import { formatCellId } from '../../src/lib/peak-finder/peaks';
import { loadStates, stateAt } from './land';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const zip = arg('--zip', '');
const statesFile = arg('--states', '');
const dateText = arg('--date', '2026-11-10');
const out = arg('--out', 'public/peak-finder/declination.v1.json');

if (!zip || !statesFile) {
  console.error('Need --zip WMM2025COF.zip and --states us-states.json');
  process.exit(1);
}

const cof = execFileSync('unzip', ['-p', zip, 'WMM2025COF/WMM.COF'], { encoding: 'utf8', maxBuffer: 2_000_000 });
const tests = execFileSync('unzip', ['-p', zip, 'WMM2025COF/WMM2025_TEST_VALUES.txt'], { encoding: 'utf8', maxBuffer: 2_000_000 });
const model = parseWmmCof(cof);
const error = wmmTestError(model, parseWmmTests(tests));
if (error.fieldNt > 0.2 || error.declinationDeg > 0.02) {
  console.error('WMM does not match NOAA test values', error);
  process.exit(1);
}
console.log('WMM matches NOAA test values', error);

const states = loadStates(statesFile);
const date = new Date(`${dateText}T00:00:00Z`);
const cells: Record<string, number> = {};

function touches(swLat: number, swLng: number): boolean {
  const samples = [0.05, 0.5, 0.95];
  for (const dy of samples) {
    for (const dx of samples) {
      if (stateAt(states, swLng + dx, swLat + dy)) return true;
    }
  }
  return false;
}

for (let lat = 17; lat <= 72; lat += 1) {
  for (let lng = -179; lng <= -66; lng += 1) {
    if (!touches(lat, lng)) continue;
    const value = declinationDeg(model, lat + 0.5, lng + 0.5, date);
    cells[formatCellId(lat, lng)] = Math.round(value * 10) / 10;
  }
  for (let lng = 170; lng <= 179; lng += 1) {
    if (!touches(lat, lng)) continue;
    const value = declinationDeg(model, lat + 0.5, lng + 0.5, date);
    cells[formatCellId(lat, lng)] = Math.round(value * 10) / 10;
  }
}

const table = {
  v: 1 as const,
  model: 'WMM2025',
  date: dateText,
  step: 1,
  cells,
};

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(table)}\n`);

const places = [
  ['Pittsburgh', 40.44, -79.99],
  ['Staten Island', 40.58, -74.15],
  ['Mount Marcy', 44.1128, -73.9239],
  ['Mount Washington', 44.2706, -71.3036],
  ['Katahdin', 45.9044, -68.9213],
];
for (const [name, lat, lng] of places) {
  const id = formatCellId(Math.floor(Number(lat)), Math.floor(Number(lng)));
  console.log(`${name}: ${cells[id]}° (cell ${id})`);
}
console.log(`Wrote ${Object.keys(cells).length} cells to ${out}`);
