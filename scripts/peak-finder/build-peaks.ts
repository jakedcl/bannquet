/**
 * One-off. Builds the 2° US peak chunks from an OSM extract and the GeoNames US dump.
 * Nothing here is fetched at runtime, and the raw extracts are not stored in the repo.
 *
 * Northeast (the nine states), after osmium has written a geojsonseq of peaks and hills:
 *
 *   npx tsx scripts/peak-finder/build-peaks.ts \
 *     --osm peaks.geojsonl \
 *     --geonames US.zip \
 *     --states us-states.json \
 *     --region northeast \
 *     --out public/peak-finder/peaks
 *
 * Whole US: point --osm at a geojsonseq from the Geofabrik US extract
 * (`osmium tags-filter us-latest.osm.pbf n/natural=peak n/natural=hill`, then
 * `osmium export -f geojsonseq`) and pass --region us.
 *
 * Or pass --pbf and this script runs those two osmium commands itself.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { chunkId, chunkOrigin, dedupePeaks, encodePeak, type PeakIndex, type RawPeak } from '../../src/lib/peak-finder/peaks';
import { PEAK_CREDITS } from '../../src/lib/peak-finder/constants';
import { NORTHEAST, NORTHEAST_CODES, loadStates, stateNear, type StateLand } from './land';

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? '' : '';
}

const regionArg = arg('--region') || 'northeast';
if (regionArg !== 'northeast' && regionArg !== 'us') {
  throw new Error('--region must be northeast or us');
}
const region: 'northeast' | 'us' = regionArg;
const outDir = arg('--out') || 'public/peak-finder/peaks';
const statesFile = arg('--states');
const geonames = arg('--geonames');
let osm = arg('--osm');
const pbf = arg('--pbf');

if (!statesFile || !geonames || (!osm && !pbf)) {
  console.error('Need --states, --geonames, and --osm or --pbf');
  process.exit(1);
}
if (region !== 'northeast' && region !== 'us') {
  console.error('--region must be northeast or us');
  process.exit(1);
}

if (pbf) {
  osm = path.join(outDir, `.tmp-${region}-peaks.geojsonl`);
  mkdirSync(outDir, { recursive: true });
  const filtered = path.join(outDir, `.tmp-${region}-peaks.osm.pbf`);
  execFileSync('osmium', ['tags-filter', pbf, 'n/natural=peak', 'n/natural=hill', '-o', filtered, '--overwrite'], { stdio: 'inherit' });
  execFileSync('osmium', ['export', filtered, '-f', 'geojsonseq', '-o', osm, '--overwrite'], { stdio: 'inherit' });
  rmSync(filtered, { force: true });
}

const states = loadStates(statesFile);
const allowed = region === 'northeast' ? NORTHEAST : null;

function parseEle(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim().toLowerCase();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const height = Number(match[0]);
  if (!Number.isFinite(height)) return null;
  return Math.round(text.includes('ft') || text.includes("'") ? height * 0.3048 : height);
}

function keepState(name: string | null): boolean {
  if (!name) return false;
  if (allowed && !allowed.has(name)) return false;
  return true;
}

async function readOsm(file: string, land: readonly StateLand[]): Promise<RawPeak[]> {
  const peaks: RawPeak[] = [];
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    const start = line.indexOf('{');
    if (start < 0) continue;
    const feature = JSON.parse(line.slice(start)) as {
      geometry?: { type?: string; coordinates?: number[] };
      properties?: Record<string, unknown>;
    };
    const props = feature.properties ?? {};
    const natural = String(props.natural ?? '');
    if (natural !== 'peak' && natural !== 'hill') continue;
    const name = typeof props.name === 'string' ? props.name.trim() : '';
    if (!name) continue;
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    if (!keepState(stateNear(land, lng, lat))) continue;
    peaks.push({ name, lat, lng, elevationM: parseEle(props.ele), source: 'osm' });
  }
  return peaks;
}

function forEachLine(input: string, onLine: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = input.endsWith('.zip')
      ? spawn('unzip', ['-p', input, 'US.txt'], { stdio: ['ignore', 'pipe', 'inherit'] })
      : null;
    const stream = child ? child.stdout : createReadStream(input);
    if (!stream) {
      reject(new Error('No GeoNames stream'));
      return;
    }
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    lines.on('line', onLine);
    lines.on('close', () => {
      if (!child) resolve();
    });
    child?.on('error', reject);
    child?.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`unzip exited ${code}`));
    });
    if (!child) stream.on('error', reject);
  });
}

async function readGeonames(input: string, land: readonly StateLand[]): Promise<RawPeak[]> {
  const peaks: RawPeak[] = [];
  const codes = new Set(['MT', 'PK', 'HLL', 'BUTE', 'KNLL']);
  await forEachLine(input, (line) => {
    const parts = line.split('\t');
    if (parts.length < 11) return;
    if (parts[6] !== 'T' && !codes.has(parts[7] ?? '')) return;
    if (!codes.has(parts[7] ?? '')) return;
    if (parts[8] !== 'US') return;
    const admin = parts[10] ?? '';
    if (region === 'northeast' && !NORTHEAST_CODES.has(admin)) return;
    if (region === 'us' && admin === 'PR') return;
    const lat = Number(parts[4]);
    const lng = Number(parts[5]);
    const name = (parts[1] ?? '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!keepState(stateNear(land, lng, lat))) return;
    const elevation = parts[15]?.trim() ? Number(parts[15]) : parts[16]?.trim() ? Number(parts[16]) : null;
    peaks.push({
      name,
      lat,
      lng,
      elevationM: elevation != null && Number.isFinite(elevation) ? Math.round(elevation) : null,
      source: 'geonames',
    });
  });
  return peaks;
}

async function main(): Promise<void> {
const osmFile = osm;
const osmPeaks = await readOsm(osmFile, states);
console.log(`OSM named peaks kept: ${osmPeaks.length}`);
const geoPeaks = await readGeonames(geonames, states);
console.log(`GeoNames peaks kept: ${geoPeaks.length}`);
const merged = dedupePeaks(osmPeaks, geoPeaks);
const added = merged.filter((peak) => peak.source === 'geonames').length;
console.log(`Merged ${merged.length} (GeoNames-only ${added})`);

const groups = new Map<string, RawPeak[]>();
for (const peak of merged) {
  const id = chunkId(peak.lat, peak.lng);
  const list = groups.get(id);
  if (list) list.push(peak);
  else groups.set(id, [peak]);
}

rmSync(path.join(outDir, 'us'), { recursive: true, force: true });
mkdirSync(path.join(outDir, 'us'), { recursive: true });

const chunks: { id: string; count: number; bytes: number; gzip: number }[] = [];
for (const id of [...groups.keys()].sort()) {
  const list = groups.get(id) ?? [];
  list.sort((a, b) => a.lat - b.lat || a.lng - b.lng || a.name.localeCompare(b.name));
  const origin = chunkOrigin(list[0]?.lat ?? 0, list[0]?.lng ?? 0);
  const file = {
    v: 1,
    id,
    sw: [origin.lng, origin.lat] as [number, number],
    peaks: list.map((peak) => encodePeak(peak)),
  };
  const json = JSON.stringify(file);
  writeFileSync(path.join(outDir, 'us', `${id}.v1.json`), json);
  chunks.push({ id, count: list.length, bytes: Buffer.byteLength(json), gzip: gzipSync(json).length });
}

const withHeight = merged.filter((peak) => peak.elevationM != null).length;
const index: PeakIndex = {
  v: 1,
  coverage: region,
  states: region === 'northeast'
    ? [...NORTHEAST_CODES].sort()
    : ['US'],
  cellDeg: 2,
  built: '2026-11-10',
  count: merged.length,
  credits: PEAK_CREDITS,
  chunks: chunks.map(({ id, count }) => ({ id, count })),
};
writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

const raw = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
const gzip = chunks.reduce((sum, chunk) => sum + chunk.gzip, 0);
console.log(JSON.stringify({
  region,
  peaks: merged.length,
  withHeight,
  missingHeight: merged.length - withHeight,
  chunks: chunks.length,
  rawBytes: raw,
  gzipBytes: gzip,
}, null, 2));

if (pbf && osmFile.includes('.tmp-')) rmSync(osmFile, { force: true });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
