#!/usr/bin/env node
/** Builds config/mountain-weather/bulletin-bindings.json from places.json */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));

/** Forecast-office overrides (CWA), not catalog office field alone. */
const BULLETIN_OFFICE_OVERRIDE = {
  'gunks-ridge': {
    office: 'ALY',
    bindReason: 'Mid-Hudson / Catskills CWA (KALY), not KBTV.',
  },
  'thacher-park': {
    office: 'ALY',
    bindReason: 'Capital District CWA (KALY), not KBTV.',
  },
};

const STATE_WHOLE_AREA = {
  vt: { office: 'BTV', bindReason: 'All catalog VT peaks are in KBTV; HWO covers Vermont zones.' },
  nh: { office: 'GYX', bindReason: 'All catalog NH peaks are in KGYX.' },
  me: { office: 'CAR', bindReason: 'All catalog ME peaks are in KCAR.' },
  ny: null,
};

/**
 * Section in-page bulletins only when every place shares one WFO and that WFO matches the section.
 * central-southern-adirondacks omitted (BTV + ALY mix).
 */
const SECTION_WHOLE_AREA = {
  'adirondack-high-peaks': { office: 'BTV', bindReason: 'Section is entirely KBTV (Essex/Franklin ADK).' },
  'northern-adirondacks': { office: 'BTV', bindReason: 'Section is entirely KBTV.' },
  'jay-peak': { office: 'BTV', bindReason: 'Section is entirely KBTV (NEK / Orleans).' },
  'northern-greens': { office: 'BTV', bindReason: 'Section is entirely KBTV.' },
  'central-greens': { office: 'BTV', bindReason: 'Section is entirely KBTV.' },
  'northeast-kingdom': { office: 'BTV', bindReason: 'Section is entirely KBTV (NEK).' },
  'southern-greens': { office: 'BTV', bindReason: 'Section is entirely KBTV (Rutland/Windsor/etc.).' },
  'catskill-mountains': { office: 'ALY', bindReason: 'Section is entirely KALY.' },
  shawangunks: { office: 'ALY', bindReason: 'Single place; CWA KALY (override from catalog BTV).' },
  'thacher-park': { office: 'ALY', bindReason: 'Single place; CWA KALY.' },
  'presidential-range': { office: 'GYX', bindReason: 'Section is entirely KGYX.' },
  'franconia-pemi': { office: 'GYX', bindReason: 'Section is entirely KGYX.' },
  'rumney-climbing': { office: 'GYX', bindReason: 'Section is entirely KGYX.' },
  'monadnock-region': { office: 'GYX', bindReason: 'Section is entirely KGYX.' },
  'baxter-state-park': { office: 'CAR', bindReason: 'Section is entirely KCAR.' },
  'mahoosucs-bigelow': { office: 'CAR', bindReason: 'Section is entirely KCAR.' },
  'northern-maine': { office: 'CAR', bindReason: 'Section is entirely KCAR.' },
  acadia: { office: 'CAR', bindReason: 'Section is entirely KCAR.' },
};

const placeOffices = {};
for (const state of places.states) {
  for (const section of state.sections) {
    for (const place of section.places) {
      const over = BULLETIN_OFFICE_OVERRIDE[place.id];
      if (over) {
        placeOffices[place.id] = { office: over.office, bindReason: over.bindReason };
      } else {
        placeOffices[place.id] = {
          office: place.office,
          bindReason: `Catalog place.office ${place.office} (CWA matches county assignment in places.json).`,
        };
      }
    }
  }
}

const out = {
  version: 1,
  places: placeOffices,
  states: STATE_WHOLE_AREA,
  sections: SECTION_WHOLE_AREA,
  unboundScopes: {
    'central-southern-adirondacks':
      'Mixed KBTV and KALY peaks in one section; no single office covers the whole section.',
    ny: 'Catalog NY spans KBTV and KALY; no state-wide bulletin block.',
  },
};

const outPath = path.join(ROOT, 'config/mountain-weather/bulletin-bindings.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote bulletin bindings for ${Object.keys(placeOffices).length} places to ${outPath}`);