#!/usr/bin/env node
/** Applies config/mountain-weather/nws-points.json cwa (+ gridId) onto places.json office field. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const placesPath = path.join(ROOT, 'config/mountain-weather/places.json');
const nwsPath = path.join(ROOT, 'config/mountain-weather/nws-points.json');

const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
const nws = JSON.parse(fs.readFileSync(nwsPath, 'utf8'));

let updated = 0;
let skipped = 0;

for (const state of places.states) {
  for (const section of state.sections) {
    for (const place of section.places) {
      if (nws.skipped?.[place.id]) {
        skipped += 1;
        continue;
      }
      const pt = nws.points[place.id];
      if (!pt?.cwa) throw new Error(`Missing NWS point for ${place.id}`);
      place.office = pt.cwa;
      if (pt.gridId) place.gridId = pt.gridId;
      updated += 1;
    }
  }
}

fs.writeFileSync(placesPath, `${JSON.stringify(places, null, 2)}\n`);
console.log(`Updated office on ${updated} places (${skipped} skipped). Wrote ${placesPath}`);