#!/usr/bin/env node
/** Builds config/mountain-weather/source-bindings.json from places.json */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));

const AVG_BY_PLACE = {
  'smugglers-notch': { office: 'BTV', pointMatch: 'Smugglers Notch' },
  'mount-marcy': { office: 'BTV', pointMatch: 'Mount Marcy' },
  'algonquin-peak': { office: 'BTV', pointMatch: 'Algonquin Peak' },
  'whiteface-mountain': { office: 'BTV', pointMatch: 'Whiteface Mountain' },
  'dix-mountain': { office: 'BTV', pointMatch: 'Dix Mountain' },
  'mount-colden': { office: 'BTV', pointMatch: 'Mount Colden' },
  'mount-colvin': { office: 'BTV', pointMatch: 'Mount Colvin' },
  'mount-mansfield': {
    office: 'BTV',
    pointMatch: 'Smugglers Notch',
    nearbyLabel:
      'Smugglers Notch AVG (nearby; Essex County VT Monadnock naming is unrelated — NH Mount Monadnock has no BTV AVG point)',
  },
  'mount-washington': [
    { office: 'GYX', pointMatch: 'PRESIDENTIAL RANGE FORECAST AREA/MOUNT WASHINGTON' },
    { office: 'GYX', pointMatch: 'TUCKERMAN AND HUNTINGTON RAVINES' },
  ],
  'mount-adams': [
    {
      office: 'GYX',
      pointMatch: 'PRESIDENTIAL RANGE FORECAST AREA/MOUNT WASHINGTON',
      nearbyLabel:
        'Presidential Range / Mount Washington AVG (6,288 ft); Adams also has REC 2,500–4,000 ft band and allLocations MOUNT ADAMS',
    },
    { office: 'GYX', pointMatch: 'TUCKERMAN AND HUNTINGTON RAVINES' },
  ],
  'pinkham-notch': { office: 'GYX', pointMatch: 'TUCKERMAN AND HUNTINGTON RAVINES' },
  'mount-lafayette': {
    office: 'GYX',
    pointMatch: 'FRANCONIA NOTCH/MOUNT LAFAYETTE',
    elevationNote: '4,000 ft (AVG point elevation, not Lafayette summit)',
  },
  'franconia-notch': {
    office: 'GYX',
    pointMatch: 'FRANCONIA NOTCH/MOUNT LAFAYETTE',
    elevationNote: '4,000 ft (Franconia Notch / Lafayette AVG point)',
  },
  'crawford-notch': { office: 'GYX', pointMatch: 'CRAWFORD NOTCH AMC HIGHLAND CENTER' },
  'kancamagus-pass': { office: 'GYX', pointMatch: 'KANCAMAGUS HIGHWAY PASS' },
  'mount-osceola': { office: 'GYX', pointMatch: 'MOUNT OSCEOLA' },
  'cannon-mountain': { office: 'GYX', pointMatch: 'CANNON MOUNTAIN' },
  'baldface-mountain': { office: 'GYX', pointMatch: 'BALDFACE MOUNTAIN' },
  'mount-moosilauke': { office: 'GYX', pointMatch: 'MOUNT MOOSILAUKE' },
};

const MID_ELEVATION_BAND_LABEL =
  'Mid-elevation band (2,500–4,000 ft; GYX labels this Mount Adams)';

const PRESIDENTIAL_REC_BANDS = [
  { office: 'GYX', sectionMatch: 'Summits Above 4000 Feet' },
  { office: 'GYX', sectionMatch: '2500 Feet to 4000 Feet', nearbyLabel: MID_ELEVATION_BAND_LABEL },
];

const ALL_LOCATIONS_BY_PLACE = {
  'mount-washington': [
    { office: 'GYX', loc: 'MOUNT WASHINGTON' },
    { office: 'GYX', loc: 'MOUNT ADAMS', bandLabel: MID_ELEVATION_BAND_LABEL },
  ],
  'mount-adams': [
    { office: 'GYX', loc: 'MOUNT ADAMS', bandLabel: MID_ELEVATION_BAND_LABEL },
    {
      office: 'GYX',
      loc: 'MOUNT WASHINGTON',
      bandLabel: 'Summits above 4,000 ft (Mount Washington)',
    },
  ],
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
      let rec = recForPlace(place, section.id, state.code);
      if (place.id === 'mount-washington' || place.id === 'mount-adams') {
        rec = PRESIDENTIAL_REC_BANDS;
      }
      const allLocations = ALL_LOCATIONS_BY_PLACE[place.id] ?? null;
      const avg = AVG_BY_PLACE[place.id] ?? null;
      if (!rec && !allLocations && !avg) continue;
      out.places[place.id] = {
        ...(rec ? { rec } : {}),
        ...(allLocations ? { allLocations } : {}),
        ...(avg ? { avg } : {}),
      };
    }
  }
}

const outPath = path.join(ROOT, 'config/mountain-weather/source-bindings.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out.places).length} place bindings to ${outPath}`);
