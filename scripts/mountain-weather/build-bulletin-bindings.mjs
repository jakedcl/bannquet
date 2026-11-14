#!/usr/bin/env node
/** Builds config/mountain-weather/bulletin-bindings.json from places.json + nws-points.json */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));
const nws = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/nws-points.json'), 'utf8'));

function bindReason(placeId) {
  const pt = nws.points[placeId];
  if (nws.skipped?.[placeId]) return nws.skipped[placeId].reason;
  if (!pt) return 'No nws-points row.';
  return `api.weather.gov/points cwa=${pt.cwa}${pt.gridId ? ` gridId=${pt.gridId}` : ''}.`;
}

const placeOffices = {};
for (const state of places.states) {
  for (const section of state.sections) {
    for (const place of section.places) {
      placeOffices[place.id] = {
        office: place.office,
        bindReason: bindReason(place.id),
      };
    }
  }
}

function homogeneousOffice(placeList) {
  const offices = new Set(placeList.map((p) => p.office));
  if (offices.size !== 1) return null;
  return [...offices][0];
}

const STATE_WHOLE_AREA = {};
for (const state of places.states) {
  const allPlaces = state.sections.flatMap((s) => s.places);
  const office = homogeneousOffice(allPlaces);
  STATE_WHOLE_AREA[state.code] = office
    ? { office, bindReason: `Every catalog ${state.name} place shares cwa ${office}.` }
    : null;
}

const SECTION_WHOLE_AREA = {};
const unboundScopes = {};
for (const state of places.states) {
  for (const section of state.sections) {
    const office = homogeneousOffice(section.places);
    if (office) {
      SECTION_WHOLE_AREA[section.id] = {
        office,
        bindReason: `Every place in ${section.title} shares cwa ${office}.`,
      };
    } else {
      const mix = [...new Set(section.places.map((p) => p.office))].join(', ');
      unboundScopes[section.id] = `Mixed cwa (${mix}); no single-office bulletin block.`;
    }
  }
}

if (!STATE_WHOLE_AREA.ny) {
  unboundScopes.ny = 'Catalog New York spans multiple CWAs; no state-wide bulletin block.';
}

const out = {
  version: 1,
  places: placeOffices,
  states: STATE_WHOLE_AREA,
  sections: SECTION_WHOLE_AREA,
  unboundScopes,
};

const outPath = path.join(ROOT, 'config/mountain-weather/bulletin-bindings.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote bulletin bindings for ${Object.keys(placeOffices).length} places to ${outPath}`);