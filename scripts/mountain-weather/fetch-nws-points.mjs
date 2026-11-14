#!/usr/bin/env node
/**
 * Fetches api.weather.gov/points for every place in places.json.
 * Run after coordinate changes; commit config/mountain-weather/nws-points.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const placesPath = path.join(ROOT, 'config/mountain-weather/places.json');
const outPath = path.join(ROOT, 'config/mountain-weather/nws-points.json');


const SUPPORTED_PRODUCT_OFFICES = new Set(['BTV', 'ALY', 'GYX', 'CAR']);

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

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
          stateCode: state.code,
          sectionId: section.id,
        });
      }
    }
  }
  return rows;
}

async function fetchPoint(lat, lon) {
  const url = `https://api.weather.gov/points/${lat},${lon}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json, application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const p = body.properties ?? {};
  const officeHref = typeof p.forecastOffice === 'string' ? p.forecastOffice : '';
  const officeFromHref = officeHref.match(/\/([A-Z]{3})$/)?.[1] ?? null;
  const cwa = typeof p.cwa === 'string' ? p.cwa : officeFromHref;
  return {
    cwa,
    gridId: typeof p.gridId === 'string' ? p.gridId : null,
    forecastOffice: officeFromHref,
    forecastZone: typeof p.forecastZone === 'string' ? p.forecastZone : null,
    county: typeof p.county === 'string' ? p.county : null,
    relativeLocation: p.relativeLocation?.properties?.city ?? null,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const rows = listPlaces();
  const points = {};
  const skipped = {};

  for (const row of rows) {
    try {
      const meta = await fetchPoint(row.lat, row.lon);
      points[row.id] = {
        lat: row.lat,
        lon: row.lon,
        ...meta,
        productOffice: SUPPORTED_PRODUCT_OFFICES.has(meta.cwa) ? meta.cwa : null,
      };
    } catch (err) {
      points[row.id] = {
        lat: row.lat,
        lon: row.lon,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    await sleep(120);
  }

  const out = {
    version: 1,
    generatedNote: 'cwa and gridId from api.weather.gov/points; productOffice is cwa when in BTV/ALY/GYX/CAR.',
    skipped,
    points,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(points).length} point lookups (${Object.keys(skipped).length} skipped) to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});