#!/usr/bin/env node
/**
 * Samples USGS EPQS elevation at each catalog coordinate and compares to elevationFt.
 * Writes config/mountain-weather/place-elevation-check.json (used by tests).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const placesPath = path.join(ROOT, 'config/mountain-weather/places.json');
const coordsPath = path.join(ROOT, 'config/mountain-weather/place-coordinates.json');
const outPath = path.join(ROOT, 'config/mountain-weather/place-elevation-check.json');

const TOLERANCE_FT = 200;
const USER_AGENT = 'Bannquet-Elevation-Check/1.0';

/** Catalog ids excluded from elevation tolerance (documented in mountain-weather-final-pass.md). */
const ELEVATION_CHECK_SKIP_IDS = new Set(['black-mountain']);

function listPlaces() {
  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  const rows = [];
  for (const state of places.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        rows.push({
          id: place.id,
          lat: place.lat,
          lon: place.lon,
          catalogElevationFt: place.elevationFt,
        });
      }
    }
  }
  return rows;
}

async function epqsElevationFt(lat, lon) {
  const url = new URL('https://epqs.nationalmap.gov/v1/json');
  url.searchParams.set('x', String(lon));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('units', 'Feet');
  url.searchParams.set('wkid', '4326');
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`EPQS HTTP ${res.status}`);
      const data = await res.json();
      const elev = Number(data?.value);
      if (!Number.isFinite(elev)) throw new Error('EPQS missing value');
      return elev;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function mapPool(items, concurrency, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const coordsFile = fs.existsSync(coordsPath)
    ? JSON.parse(fs.readFileSync(coordsPath, 'utf8'))
    : { places: {} };
  const rows = listPlaces();
  const checks = {};
  const mismatches = [];

  const results = await mapPool(rows, 3, async (row) => {
    const gnis = coordsFile.places?.[row.id];
    const gnisId = gnis?.gnisId ?? null;
    const gnisFeatureClass = gnis?.gnisFeatureClass ?? null;
    if (row.catalogElevationFt == null) {
      return { id: row.id, check: { skipped: true, reason: 'no catalog elevationFt' }, mismatch: null };
    }
    if (ELEVATION_CHECK_SKIP_IDS.has(row.id)) {
      return {
        id: row.id,
        check: { skipped: true, reason: 'excluded pending final-pass', gnisId },
        mismatch: null,
      };
    }
    if (!gnisId || gnisFeatureClass !== 'Summit') {
      return {
        id: row.id,
        check: {
          skipped: true,
          reason: 'not a pinned GNIS summit',
          catalogElevationFt: row.catalogElevationFt,
          gnisId,
          gnisFeatureClass,
        },
        mismatch: null,
      };
    }
    try {
      const sampledFt = await epqsElevationFt(row.lat, row.lon);
      const deltaFt = Math.round(sampledFt - row.catalogElevationFt);
      const ok = Math.abs(deltaFt) <= TOLERANCE_FT;
      const check = {
        catalogElevationFt: row.catalogElevationFt,
        sampledElevationFt: Math.round(sampledFt),
        deltaFt,
        withinTolerance: ok,
        source: 'usgs-epqs-at-coords',
        gnisId,
        gnisFeatureClass,
      };
      const mismatch = ok
        ? null
        : {
            id: row.id,
            catalogElevationFt: row.catalogElevationFt,
            sampledElevationFt: Math.round(sampledFt),
            deltaFt,
            gnisId,
          };
      return { id: row.id, check, mismatch };
    } catch (err) {
      const check = {
        error: err instanceof Error ? err.message : String(err),
        catalogElevationFt: row.catalogElevationFt,
        gnisId,
      };
      return { id: row.id, check, mismatch: null };
    }
  });

  for (const r of results) {
    checks[r.id] = r.check;
    if (r.mismatch) mismatches.push(r.mismatch);
  }

  const out = {
    version: 1,
    toleranceFt: TOLERANCE_FT,
    note:
      'sampledElevationFt is USGS EPQS at places.json lat/lon (terrain under GNIS summit pin); compare to catalog elevationFt.',
    mismatches: mismatches.map((m) => m.id),
    places: checks,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

  console.log(`Wrote ${outPath}`);
  const errors = Object.entries(checks).filter(([, c]) => c.error);
  if (mismatches.length) {
    console.error('Elevation mismatches (>200 ft):');
    for (const m of mismatches) console.error(JSON.stringify(m));
    process.exitCode = 1;
  } else {
    console.log('All checked GNIS summits within tolerance.');
  }
  if (errors.length) {
    console.warn(`EPQS errors (${errors.length}); re-run script to refresh samples.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});