#!/usr/bin/env node
/** Builds config/mountain-weather/source-bindings.json from places.json */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));

const ALL_LOCATIONS = {
  'mount-washington': { office: 'GYX', loc: 'MOUNT WASHINGTON' },
  'mount-adams': { office: 'GYX', loc: 'MOUNT ADAMS' },
  'sugarloaf-mountain': { office: 'GYX', loc: 'SUGARLOAF MOUNTAIN' },
  'mount-monadnock': { office: 'GYX', loc: 'MOUNT MONADNOCK' },
  'north-pack-monadnock': { office: 'GYX', loc: 'NORTH PACK MONADNOCK' },
  katahdin: { office: 'CAR', loc: 'MOUNT KATAHDIN' },
  'katahdin-woods-and-waters': { office: 'CAR', loc: 'KATAHDIN WOODS AND WATERS' },
  'cadillac-mountain': { office: 'CAR', loc: 'TOP OF CADILLAC MOUNTAIN' },
  'deboullie-mountain': { office: 'CAR', loc: 'TOP OF DEBOULLIE MOUNTAIN' },
  'mars-hill-mountain': { office: 'CAR', loc: 'TOP OF MARS HILL MOUNTAIN' },
  'white-cap-mountain': { office: 'CAR', loc: 'TOP OF WHITE CAP MOUNTAIN' },
};

function recForPlace(place, sectionId, stateCode) {
  if (sectionId === 'southern-greens') {
    return { office: 'BTV', sectionMatch: 'Southern Green Mountains of Vermont' };
  }
  if (sectionId === 'catskill-mountains' || sectionId === 'shawangunks' || sectionId === 'thacher-park') {
    if (sectionId === 'shawangunks' || sectionId === 'thacher-park') {
      return { office: 'ALY', sectionMatch: 'Mid Hudson River', nearbyLabel: 'Mid Hudson Valley REC (nearby)' };
    }
    return { office: 'ALY', sectionMatch: 'Eastern Catskills' };
  }
  if (sectionId === 'central-southern-adirondacks' && place.office === 'ALY') {
    return { office: 'ALY', sectionMatch: 'Southern Adirondacks' };
  }
  if (sectionId === 'monadnock-region') {
    return { office: 'GYX', sectionMatch: 'Summits of Mount Monadnock' };
  }
  if (sectionId === 'northeast-kingdom') {
    const band = {
      office: 'BTV',
      sectionMatch: 'Northern Adirondacks of New York',
    };
    if (place.id === 'monadnock-mountain') {
      return {
        ...band,
        nearbyLabel:
          'BTV combined Northern Adirondacks / Northern Greens band (Essex County VT Monadnock; not NH Mount Monadnock)',
      };
    }
    return band;
  }
  if (place.office === 'BTV') {
    return { office: 'BTV', sectionMatch: 'Northern Adirondacks of New York' };
  }
  if (sectionId === 'presidential-range' || sectionId === 'franconia-pemi' || sectionId === 'rumney-climbing') {
    return { office: 'GYX', sectionMatch: 'Summits Above 4000 Feet' };
  }
  if (sectionId === 'mahoosucs-bigelow') {
    return { office: 'GYX', sectionMatch: '2500 Feet to 4000 Feet' };
  }
  if (sectionId === 'baxter-state-park') {
    if (place.id === 'katahdin') return { office: 'CAR', sectionMatch: 'TOP OF MOUNT KATAHDIN' };
    if (place.id === 'katahdin-woods-and-waters') return { office: 'CAR', sectionMatch: 'KATAHDIN WOODS AND WATERS' };
    if (place.id === 'white-cap-mountain') return { office: 'CAR', sectionMatch: 'TOP OF WHITE CAP MOUNTAIN' };
    return { office: 'CAR', sectionMatch: 'TOP OF MOUNT KATAHDIN', nearbyLabel: 'Katahdin summit REC (nearby)' };
  }
  if (sectionId === 'northern-maine') {
    if (place.id === 'deboullie-mountain') return { office: 'CAR', sectionMatch: 'TOP OF DEBOULLIE MOUNTAIN' };
    if (place.id === 'mars-hill-mountain') return { office: 'CAR', sectionMatch: 'TOP OF MARS HILL MOUNTAIN' };
  }
  if (sectionId === 'acadia') {
    if (place.id === 'cadillac-mountain') return { office: 'CAR', sectionMatch: 'TOP OF CADILLAC MOUNTAIN' };
    return { office: 'CAR', sectionMatch: 'TOP OF CADILLAC MOUNTAIN', nearbyLabel: 'Cadillac summit REC (nearby)' };
  }
  return null;
}

const out = { version: 1, places: {} };
for (const state of places.states) {
  for (const section of state.sections) {
    for (const place of section.places) {
      const rec = recForPlace(place, section.id, state.code);
      const allLocations = ALL_LOCATIONS[place.id] ?? null;
      if (!rec && !allLocations) continue;
      out.places[place.id] = {
        ...(rec ? { rec } : {}),
        ...(allLocations ? { allLocations } : {}),
      };
    }
  }
}

const outPath = path.join(ROOT, 'config/mountain-weather/source-bindings.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out.places).length} place bindings to ${outPath}`);
