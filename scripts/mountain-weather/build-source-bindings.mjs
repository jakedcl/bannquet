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
 * Explicit BTV balloon bindings: BTV WFO county + a named city from that region’s balloon.xml list.
 */
const BALLOON_BY_PLACE = {
  'mount-marcy': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'whiteface-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'dix-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'algonquin-peak': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'mount-colden': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'mount-colvin': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Keene, Essex Co. NY, BTV WFO).' },
  'giant-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Keene, Essex Co. NY, BTV WFO).' },
  'santanoni-peak': { regionMatch: BALLOON_N_ADK, bindReason: 'Newcomb bulletin city (Essex Co. NY, BTV WFO).' },
  'cascade-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Keene, Essex Co. NY, BTV WFO).' },
  'mckenzie-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake bulletin city (Franklin Co. NY, BTV WFO).' },
  'mount-van-hoevenberg': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Essex Co. NY, BTV WFO).' },
  'keene-valley': { regionMatch: BALLOON_N_ADK, bindReason: 'Lake Placid bulletin city (Keene, Essex Co. NY, BTV WFO).' },
  'ampersand-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake bulletin city (Franklin/Essex Co. NY, BTV WFO).' },
  'debar-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake bulletin city (Franklin Co. NY, BTV WFO).' },
  'st-regis-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Saranac Lake bulletin city (Franklin Co. NY, BTV WFO).' },
  'mount-arab': { regionMatch: BALLOON_N_ADK, bindReason: 'Tupper Lake bulletin city (Franklin/St. Lawrence Co. NY, BTV WFO).' },
  'lyon-mountain': { regionMatch: BALLOON_N_ADK, bindReason: 'Dannemora bulletin city (Clinton Co. NY, BTV WFO).' },
  'jay-peak': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Newport/Derby bulletin cities (Orleans Co. VT, BTV WFO).' },
  'belvidere-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Newport bulletin city (Orleans Co. VT, BTV WFO).' },
  'jay-village': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Derby bulletin city (Orleans Co. VT, BTV WFO).' },
  'mount-mansfield': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe bulletin city (Lamoille Co. VT, BTV WFO).' },
  'smugglers-notch': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe bulletin city (Lamoille Co. VT, BTV WFO).' },
  'stowe-town': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Stowe bulletin city (Lamoille Co. VT, BTV WFO).' },
  'camels-hump': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Waitsfield bulletin city (Washington Co. VT, BTV WFO).' },
  'mount-ellen': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Waitsfield bulletin city (Washington Co. VT, BTV WFO).' },
  'mount-worcester': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Montpelier bulletin city (Worcester, Washington Co. VT, BTV WFO).' },
  'waterbury': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Montpelier bulletin city (Waterbury, Washington Co. VT, BTV WFO).' },
  'bread-loaf-mountain': { regionMatch: BALLOON_CHAMPLAIN, bindReason: 'Middlebury/Ripton bulletin cities (Addison Co. VT, BTV WFO).' },
  'burke-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Newport bulletin city (Orleans Co. VT, BTV WFO).' },
  'signal-mountain': { regionMatch: BALLOON_CENTRAL_NE, bindReason: 'Island Pond bulletin city (Essex Co. VT, BTV WFO).' },
  'monadnock-mountain': {
    regionMatch: BALLOON_CENTRAL_NE,
    bindReason: 'Bradford bulletin city (Essex Co. VT, BTV WFO).',
    nearbyLabel: 'Essex County VT Monadnock only — NH Mount Monadnock is GYX, not this balloon product.',
  },
  'killington-peak': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Killington bulletin city (Rutland Co. VT, BTV WFO).' },
  'ludlow-mountain': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Ludlow bulletin city (Windsor Co. VT, BTV WFO).' },
  'mount-ascutney': { regionMatch: BALLOON_SOUTHERN, bindReason: 'Springfield bulletin city (Windsor Co. VT, BTV WFO).' },
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

const REC_PLACE_OVERRIDE = {
  'pillsbury-mountain': {
    office: 'GYX',
    sectionMatch: '2500 Feet to 4000 Feet',
    nearbyLabel: 'KGYX mid-elevation REC (Pillsbury under Gray CWA)',
  },
  'lyon-mountain': {
    office: 'ALY',
    sectionMatch: 'Southern Adirondacks',
    nearbyLabel: 'KALY REC (Clinton Co. under Albany CWA)',
  },
};

function recForPlace(place, sectionId, stateCode) {
  if (REC_PLACE_OVERRIDE[place.id]) return REC_PLACE_OVERRIDE[place.id];

  const wfo = place.office;

  if (sectionId === 'southern-greens') {
    if (wfo === 'BTV') return { office: 'BTV', sectionMatch: 'Southern Green Mountains of Vermont' };
    if (wfo === 'ALY') {
      return {
        office: 'ALY',
        sectionMatch: 'Southern Adirondacks',
        nearbyLabel: 'KALY recreation band nearest southern Green peak',
      };
    }
    if (wfo === 'BOX') {
      return { office: 'BOX', sectionMatch: 'Southern New England', nearbyLabel: 'KBOX REC (Stratton area)' };
    }
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
  if (wfo === 'BTV') {
    return { office: 'BTV', sectionMatch: 'Northern Adirondacks of New York' };
  }
  if (wfo === 'ALY') {
    if (sectionId === 'northern-adirondacks' || sectionId === 'adirondack-high-peaks') {
      return {
        office: 'ALY',
        sectionMatch: 'Southern Adirondacks',
        nearbyLabel: 'KALY REC band nearest northern Adirondack peak',
      };
    }
    return null;
  }
  if (wfo === 'GYX' && sectionId === 'central-southern-adirondacks') {
    return {
      office: 'GYX',
      sectionMatch: '2500 Feet to 4000 Feet',
      nearbyLabel: 'KGYX REC nearest western Maine / northern NH band',
    };
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
