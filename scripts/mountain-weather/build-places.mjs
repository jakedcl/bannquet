#!/usr/bin/env node
/**
 * Builds config/mountain-weather/places.json from the approved 90-place list
 * plus coordinates from config/weather-regions.json and peak-finder tiles.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PLAN = process.env.WEATHER_PLAN
  ?? '/home/ubuntu/.cursor/projects/agent-repos-bannquet/uploads/weather-build-plan_83bf.txt';

const SECTION_SLUGS = {
  'Adirondack High Peaks': 'adirondack-high-peaks',
  'Northern Adirondacks': 'northern-adirondacks',
  'Central and Southern Adirondacks': 'central-southern-adirondacks',
  'Catskill Mountains': 'catskill-mountains',
  'Shawangunks': 'shawangunks',
  'Thacher Park': 'thacher-park',
  'Jay Peak': 'jay-peak',
  'Northern Greens': 'northern-greens',
  'Central Greens': 'central-greens',
  'Northeast Kingdom (new)': 'northeast-kingdom',
  'Southern Greens': 'southern-greens',
  'Presidential Range': 'presidential-range',
  'Franconia & Pemi': 'franconia-pemi',
  'Rumney Climbing': 'rumney-climbing',
  'Monadnock Region (new)': 'monadnock-region',
  'Baxter State Park': 'baxter-state-park',
  'Mahoosucs & Bigelow': 'mahoosucs-bigelow',
  'Northern Maine (new)': 'northern-maine',
  'Acadia': 'acadia',
};

const OFFICE_BY_STATE = { NY: 'BTV', VT: 'BTV', NH: 'GYX', ME: 'CAR' };

/** Overrides when peak-finder name match is weak (lat, lon, elevationFt). */
const COORD_OVERRIDES = {
  'mount-adams': { lat: 44.3197, lon: -71.2914, elevationFt: 5774 },
  'crawford-notch': { lat: 44.165, lon: -71.395, elevationFt: 1900 },
  'kancamagus-pass': { lat: 44.053, lon: -71.418, elevationFt: 2855 },
  'mount-monadnock': { lat: 42.8605, lon: -72.1087, elevationFt: 3165 },
  'north-pack-monadnock': { lat: 42.897, lon: -71.871, elevationFt: 2276 },
  'sugarloaf-mountain': { lat: 45.0317, lon: -70.3117, elevationFt: 4237 },
  'katahdin-woods-and-waters': { lat: 45.898, lon: -68.55, elevationFt: 1200 },
  'smugglers-notch': { lat: 44.554, lon: -72.786, elevationFt: 3370 },
  'gunks-ridge': { lat: 41.7361, lon: -74.2361, elevationFt: 2240 },
  'mount-arab': { lat: 44.3114, lon: -74.4417, elevationFt: 2533 },
  'mount-equinox': { lat: 43.1228, lon: -73.1765, elevationFt: 3840 },
  'mount-ascutney': { lat: 43.4331, lon: -72.4365, elevationFt: 3140 },
  'whiteface-mountain': { lat: 44.3658, lon: -73.9026, elevationFt: 4867 },
  'dix-mountain': { lat: 44.0825, lon: -73.7572, elevationFt: 4857 },
  'algonquin-peak': { lat: 44.1567, lon: -73.9857, elevationFt: 5114 },
  'mount-colden': { lat: 44.1342, lon: -73.9419, elevationFt: 4715 },
  'mount-colvin': { lat: 44.0947, lon: -73.8947, elevationFt: 4080 },
  'giant-mountain': { lat: 44.1596, lon: -73.7203, elevationFt: 4627 },
  'santanoni-peak': { lat: 44.0961, lon: -74.1319, elevationFt: 4607 },
  'cascade-mountain': { lat: 44.1953, lon: -73.8747, elevationFt: 4098 },
  'mckenzie-mountain': { lat: 44.4328, lon: -74.0956, elevationFt: 3822 },
  'mount-van-hoevenberg': { lat: 44.2408, lon: -73.8328, elevationFt: 2939 },
  'st-regis-mountain': { lat: 44.4078, lon: -74.2525, elevationFt: 2838 },
  'fishing-brook-range': { lat: 43.8936, lon: -74.3186, elevationFt: 3400 },
  'mount-tremper': { lat: 42.0417, lon: -74.2833, elevationFt: 2740 },
};

function slugify(name) {
  const base = name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/['.]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base;
}

function cleanName(name) {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

function parseElevation(raw) {
  const n = parseInt(String(raw).replace(/,/g, '').replace(/\s*tbc/i, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parsePlanRows(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.includes('const draftRows'));
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('];')) break;
    if (!line.startsWith('[')) continue;
    const match = line.match(/^\[\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/);
    if (!match) continue;
    out.push({
      name: match[1],
      elevationFt: parseElevation(match[2]),
      state: match[3].toLowerCase(),
      sectionTitle: match[4],
    });
  }
  return out;
}

function loadLegacySpots() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/weather-regions.json'), 'utf8'));
  const map = new Map();
  for (const region of raw.regions) {
    for (const section of region.sections) {
      for (const spot of section.spots) {
        map.set(spot.name.toLowerCase(), {
          lat: spot.lat,
          lon: spot.lon,
          elevationFt: spot.elevation,
          id: spot.id,
        });
      }
    }
  }
  return map;
}

function inNortheast(lat, lon) {
  return lat >= 41 && lat <= 47.5 && lon <= -66 && lon >= -75.5;
}

function loadPeakIndex() {
  const dir = path.join(ROOT, 'public/peak-finder/peaks/us');
  const index = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [name, lonE4, latE4, elevFt] of data.peaks ?? []) {
      const lat = latE4 / 10000;
      const lon = lonE4 / 10000;
      if (!inNortheast(lat, lon)) continue;
      const key = name.toLowerCase();
      if (!index.has(key)) {
        index.set(key, { lat, lon, elevationFt: elevFt ?? null });
      }
    }
  }
  return index;
}

function lookupCoords(name, legacy, peaks) {
  const key = slugify(name);
  if (COORD_OVERRIDES[key]) return { ...COORD_OVERRIDES[key], id: key };

  const plain = cleanName(name).toLowerCase();
  if (legacy.has(plain)) return { ...legacy.get(plain), id: legacy.get(plain).id ?? key };

  const aliases = {
    "camel's hump": 'camels hump',
    'bolton / waterbury (town)': 'bolton / waterbury',
    'jay village (town)': 'jay village',
    'tannersville (town)': 'tannersville',
    'manchester (town)': 'manchester',
    'gunks ridge (crag)': 'gunks ridge',
    'thacher state park (park)': 'thacher state park',
    'keene valley (valley)': 'keene valley',
    'pinkham notch (notch)': 'pinkham notch',
    'franconia notch (notch)': 'franconia notch',
    'rumney crags (crag)': 'rumney crags',
    'katahdin woods and waters (area)': 'katahdin woods and waters',
    'bar harbor (town)': 'bar harbor',
    'ludlow mountain (okemo)': 'ludlow mountain',
    'monadnock mountain (vt)': 'monadnock mountain',
  };
  const search = aliases[plain] ?? plain;
  if (legacy.has(search)) return { ...legacy.get(search), id: legacy.get(search).id ?? key };
  if (peaks.has(search)) {
    const hit = peaks.get(search);
    return { lat: hit.lat, lon: hit.lon, elevationFt: hit.elevationFt, id: key };
  }
  for (const [peakName, coords] of peaks) {
    if (peakName.includes(search) || search.includes(peakName)) {
      return { ...coords, id: key };
    }
  }
  return null;
}

function isBaseName(name) {
  return /\((valley|town|notch|pass|crag|park|area)\)/i.test(name);
}

function main() {
  const planText = fs.readFileSync(PLAN, 'utf8');
  const rows = parsePlanRows(planText);
  if (rows.length !== 90) {
    throw new Error(`Expected 90 places, got ${rows.length}`);
  }
  const legacy = loadLegacySpots();
  const peaks = loadPeakIndex();

  const states = { ny: [], vt: [], nh: [], me: [] };
  const missing = [];

  for (const row of rows) {
    const coords = lookupCoords(row.name, legacy, peaks);
    if (!coords) {
      missing.push(row.name);
      continue;
    }
    const sectionId = SECTION_SLUGS[row.sectionTitle];
    if (!sectionId) throw new Error(`Unknown section ${row.sectionTitle}`);
    const office = row.state === 'ny' && row.sectionTitle.includes('Catskill')
      ? 'ALY'
      : row.state === 'ny' && (row.sectionTitle === 'Central and Southern Adirondacks')
        ? (row.name.includes('Snowy') || row.name.includes('Blue Mountain') && !row.name.includes('Ridge')
          ? 'ALY' : 'BTV')
        : row.state === 'ny' && row.name.match(/Slide|Hunter|Catskill|Windham|Panther|Peekamoose|Balsam|Tremper|Red Hill|Overlook|Stratton|Equinox|Bromley|Haystack|Bald Mountain/i)
          ? 'ALY'
        : OFFICE_BY_STATE[row.state.toUpperCase()];

    states[row.state].push({
      id: coords.id,
      name: cleanName(row.name),
      sectionId,
      sectionTitle: row.sectionTitle,
      lat: coords.lat,
      lon: coords.lon,
      elevationFt: row.elevationFt ?? coords.elevationFt ?? null,
      office,
      isBase: isBaseName(row.name),
    });
  }

  if (missing.length) {
    throw new Error(`Missing coordinates for: ${missing.join(', ')}`);
  }

  const stateMeta = [
    { code: 'ny', name: 'New York' },
    { code: 'vt', name: 'Vermont' },
    { code: 'nh', name: 'New Hampshire' },
    { code: 'me', name: 'Maine' },
  ];

  const output = {
    version: 1,
    states: stateMeta.map((state) => {
      const places = states[state.code];
      const sectionMap = new Map();
      for (const place of places) {
        if (!sectionMap.has(place.sectionId)) {
          sectionMap.set(place.sectionId, { id: place.sectionId, title: place.sectionTitle, places: [] });
        }
        const { sectionTitle: _t, sectionId: _s, ...rest } = place;
        sectionMap.get(place.sectionId).places.push(rest);
      }
      return { ...state, sections: [...sectionMap.values()] };
    }),
  };

  const outPath = path.join(ROOT, 'config/mountain-weather/places.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  const total = output.states.reduce((sum, s) => sum + s.sections.reduce((n, sec) => n + sec.places.length, 0), 0);
  console.log(`Wrote ${total} places in ${output.states.length} states to ${outPath}`);
}

main();
