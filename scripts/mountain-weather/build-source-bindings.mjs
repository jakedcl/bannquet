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

/** balloon.xml region titles (must match “For …” blocks). In-page binding only when listed here — no section guessing. */
const BALLOON_CHAMPLAIN = 'the Champlain Valley of Vermont and New York';
const BALLOON_CENTRAL_NE = 'Central and Northeast Vermont';
const BALLOON_SOUTHERN = 'Southern Vermont';
const BALLOON_N_ADK = 'the Northern Adirondacks of New York';

/**
 * Explicit BTV balloon bindings: place must be BTV WFO and sit in a bulletin region’s named-city area.
 * Omitted places (e.g. ALY-area shawangunks, borderline central-southern ADK) get More sources link only.
 */
const BALLOON_BY_PLACE = {
  'mount-marcy': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Keene High Peaks; Northern Adirondacks bulletin cities (BTV).' },
  'whiteface-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid corridor; Northern Adirondacks bulletin cities (BTV).' },
  'dix-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Keene High Peaks; Northern Adirondacks bulletin cities (BTV).' },
  'algonquin-peak': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/High Peaks; Northern Adirondacks bulletin cities (BTV).' },
  'mount-colden': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/High Peaks; Northern Adirondacks bulletin cities (BTV).' },
  'mount-colvin': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Keene area; Northern Adirondacks bulletin cities (BTV).' },
  'giant-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Keene area; Northern Adirondacks bulletin cities (BTV).' },
  'santanoni-peak': { regionMatch: BALLOON_N_ADK, bindReason: 'Newcomb/Tupper corridor; Northern Adirondacks bulletin cities (BTV).' },
  'cascade-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Keene area; Northern Adirondacks bulletin cities (BTV).' },
  'mckenzie-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake area; Northern Adirondacks bulletin cities (BTV).' },
  'mount-van-hoevenberg': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid/Olympic region; Northern Adirondacks bulletin cities (BTV).' },
  'keene-valley': { regionMatch: BALLOON_N_ADK, bindReason: 'Keene Valley base; Northern Adirondacks bulletin cities (BTV).' },
  'ampersand-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake area; Northern Adirondacks bulletin cities (BTV).' },
  'debar-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake/Debar Pond area; Northern Adirondacks bulletin cities (BTV).' },
  'st-regis-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake/Paul Smiths; Northern Adirondacks bulletin cities (BTV).' },
  'mount-arab': { regionMatch: BALLOON_N_ADK, bindReason: 'Tupper Lake/Saranac area; Northern Adirondacks bulletin cities (BTV).' },
  'lyon-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Dannemora/Chazy in Northern Adirondacks bulletin cities (BTV), not St. Lawrence valley.' },
  'gore-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'North Creek/Lake Placid zone; Northern Adirondacks bulletin cities (BTV).' },
  'jay-peak': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Derby/Newport NEK; Central and Northeast Vermont bulletin cities (BTV).' },
  'belvidere-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'North/Central VT Greens; Central and Northeast Vermont bulletin cities (BTV).' },
  'jay-village': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Derby/Newport area; Central and Northeast Vermont bulletin cities (BTV).' },
  'mount-mansfield': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe/Montpelier Greens; Central and Northeast Vermont bulletin cities (BTV).' },
  'smugglers-notch': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe/Jeffersonville; Central and Northeast Vermont bulletin cities (BTV).' },
  'stowe-town': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe in bulletin city list (BTV).' },
  'camels-hump': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Montpelier/Waitsfield Greens; Central and Northeast Vermont bulletin cities (BTV).' },
  'mount-ellen': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Waitsfield/Mad River; Central and Northeast Vermont bulletin cities (BTV).' },
  'mount-worcester': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Central VT Greens; Central and Northeast Vermont bulletin cities (BTV).' },
  'waterbury': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Montpelier/Waterbury corridor; Central and Northeast Vermont bulletin cities (BTV).' },
  'bread-loaf-mountain': { regionMatch: BALLOON_CHAMPLAIN, bindReason: 'Middlebury/Ripton in Champlain Valley bulletin cities (BTV).' },
  'burke-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Newport/Derby NEK; Central and Northeast Vermont bulletin cities (BTV).' },
  'signal-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Island Pond NEK in Central and Northeast Vermont bulletin cities (BTV).' },
  'monadnock-mountain': {
    regionMatch: BALLOON_CENTRAL_NE,
    bindReason: 'Island Pond/Bradford NEK; Central and Northeast Vermont bulletin cities (BTV).',
    nearbyLabel: 'Essex County VT Monadnock only — NH Mount Monadnock is GYX, not this balloon product.',
  },
  'killington-peak': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Killington in Southern Vermont bulletin cities (BTV).' },
  'stratton-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Southern VT ski zone; Southern Vermont bulletin cities (BTV).' },
  'mount-equinox': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Manchester/Bennington area; Southern Vermont bulletin cities (BTV).' },
  'dorset-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Southern VT Greens; Southern Vermont bulletin cities (BTV).' },
  'haystack-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Wilmington/Mt Snow near Ludlow/Springfield bulletin cities (BTV).' },
  'ludlow-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Ludlow in Southern Vermont bulletin cities (BTV).' },
  'bromley-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Peru/Manchester area; Southern Vermont bulletin cities (BTV).' },
  'mount-ascutney': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Springfield/WRJ corridor in Southern Vermont bulletin cities (BTV).' },
  'bald-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Southern VT; Southern Vermont bulletin cities (BTV).' },
  'manchester-vt': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Manchester area; Southern Vermont bulletin cities (BTV).' },
};

function balloonForPlace(place) {
  if (place.office !== 'BTV') return null;
  const entry = BALLOON_BY_PLACE[place.id];
  if (!entry) return null;
  const { regionMatch, bindReason, nearbyLabel } = entry;
  return {
    regionMatch,
    ...(bindReason ? { bindReason } : {}),
    ...(nearbyLabel ? { nearbyLabel } : {}),
  };
}

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
      const balloon = balloonForPlace(place);
      if (!rec && !allLocations && !avg && !balloon) continue;
      out.places[place.id] = {
        ...(rec ? { rec } : {}),
        ...(allLocations ? { allLocations } : {}),
        ...(avg ? { avg } : {}),
        ...(balloon ? { balloon } : {}),
      };
    }
  }
}

const outPath = path.join(ROOT, 'config/mountain-weather/source-bindings.json');
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out.places).length} place bindings to ${outPath}`);
