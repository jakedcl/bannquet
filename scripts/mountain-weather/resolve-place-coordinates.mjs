#!/usr/bin/env node
/**
 * Resolves catalog coordinates from USGS GNIS (National Map Gazetteer) plus NWS mtnFcst
 * cross-check for BTV/ALY mountain-forecast points. Writes place-coordinates.json and
 * optionally applies lat/lon to places.json (--apply).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const placesPath = path.join(ROOT, 'config/mountain-weather/places.json');
const mtnPointsPath = path.join(ROOT, 'config/mountain-weather/mtn-points.json');
const outPath = path.join(ROOT, 'config/mountain-weather/place-coordinates.json');

const STATE_ALPHA = { ny: 'NY', vt: 'VT', nh: 'NH', me: 'ME' };

/** Counties that fit each catalog section (GNIS county_name must match one). */
const SECTION_COUNTIES = {
  'adirondack-high-peaks': ['Essex', 'Franklin'],
  'northern-adirondacks': ['Clinton', 'Franklin', 'Essex', 'St. Lawrence'],
  'central-southern-adirondacks': ['Hamilton', 'Warren', 'Essex', 'Herkimer', 'Fulton', 'Saratoga', 'Oneida'],
  'catskill-mountains': ['Greene', 'Ulster', 'Sullivan', 'Delaware', 'Schoharie'],
  'shawangunks': ['Ulster'],
  'thacher-park': ['Albany'],
  'jay-peak': ['Orleans', 'Franklin', 'Caledonia'],
  'northern-greens': ['Lamoille', 'Orleans', 'Washington', 'Chittenden'],
  'central-greens': ['Washington', 'Orange', 'Addison', 'Lamoille', 'Caledonia'],
  'northeast-kingdom': ['Essex', 'Caledonia', 'Orleans'],
  'southern-greens': ['Windsor', 'Rutland', 'Bennington', 'Windham'],
  'presidential-range': ['Coos', 'Carroll'],
  'franconia-pemi': ['Grafton', 'Coos', 'Carroll'],
  'rumney-climbing': ['Grafton'],
  'monadnock-region': ['Cheshire', 'Hillsborough', 'Sullivan'],
  'baxter-state-park': ['Piscataquis', 'Penobscot'],
  'mahoosucs-bigelow': ['Franklin', 'Oxford'],
  'northern-maine': ['Aroostook', 'Piscataquis', 'Somerset'],
  'acadia': ['Hancock'],
};

/** Per-place GNIS query name when it differs from catalog display name. */
const GNIS_NAME = {
  'camels-hump': 'Camels Hump',
  'st-regis-mountain': 'Saint Regis Mountain',
  'mount-tremper': 'Tremper Mountain',
  'mount-arab': 'Arab Mountain',
  'baldface-mountain': 'North Baldface',
  'north-pack-monadnock': 'North Pack Monadnock Mountain',
  'smugglers-notch': 'Smugglers Notch',
  'mount-equinox': 'Mount Equinox',
  'mount-monadnock': 'Mount Monadnock',
  bigelow: 'West Peak',
  katahdin: 'Mount Katahdin',
  'gunks-ridge': 'Shawangunk Mountains',
  'thacher-park': 'Thacher State Park',
  'rumney-crag': 'Rumney',
  'mckenzie-mountain': 'McKenzie Mountain',
  'mount-equinox': 'Equinox Mountain',
  'mount-monadnock': 'Monadnock Mountain',
  'mars-hill-mountain': 'Mars Hill',
  waterbury: 'Waterbury',
  'jay-village': 'Jay',
};

/** Narrow county when section allowlist is too wide or peak is homonymous. */
const COUNTY_ONLY = {
  'lyon-mountain': ['Clinton'],
  'blue-mountain': ['Hamilton'],
  'pillsbury-mountain': ['Hamilton'],
  'crane-mountain': ['Warren'],
  'prospect-mountain': ['Warren'],
  'gore-mountain': ['Warren'],
  'black-mountain': ['Washington'],
  'panther-mountain': ['Ulster'],
  'red-hill': ['Ulster'],
  'bread-loaf-mountain': ['Addison'],
  'stratton-mountain': ['Windham'],
  'haystack-mountain': ['Windham'],
  'bald-mountain': ['Bennington'],
  'mount-tremper': ['Ulster'],
  'mount-equinox': ['Bennington'],
  'signal-mountain': ['Caledonia'],
  'baldface-mountain': ['Coos', 'Carroll'],
  'sugarloaf-mountain': ['Franklin'],
  'mckenzie-mountain': ['Essex'],
  'debar-mountain': ['Franklin'],
  'mount-arab': ['St. Lawrence'],
  'blue-ridge-mountain': ['Hamilton', 'Essex'],
  bigelow: ['Somerset', 'Franklin'],
  'mars-hill-mountain': ['Aroostook'],
  waterbury: ['Washington'],
  'jay-village': ['Orleans'],
};

/** Hard-pinned GNIS feature ids when automated match is unreliable. */
const GNIS_FEATURE_ID = {
  'pinkham-notch': 872508,
  'crawford-notch': 871738,
  'franconia-notch': 871907,
  'kancamagus-pass': 872120,
  'smugglers-notch': 1459550,
  'mount-monadnock': 868516,
  'mount-equinox': 1461816,
  'mars-hill-mountain': 570798,
  waterbury: 1460075,
  'jay-village': 1457991,
  bigelow: 578186,
  'black-mountain': 944147,
};

/** No reliable GNIS summit — keep weather-regions.json coords (documented legacy). */
const LEGACY_WEATHER_REGIONS = new Set(['gunks-ridge', 'thacher-park', 'katahdin-woods-and-waters']);

const USER_AGENT = 'Bannquet-Mountain-Weather/1.0 (GNIS coordinate audit)';

function cleanDisplayName(name) {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

function listPlaces() {
  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  const rows = [];
  for (const state of places.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        rows.push({
          ...place,
          stateCode: state.code,
          sectionId: section.id,
        });
      }
    }
  }
  return rows;
}

function escapeSql(s) {
  return s.replace(/'/g, "''");
}

async function queryGnis(where, layer) {
  const url = new URL(`https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/${layer}/query`);
  url.searchParams.set('where', where);
  url.searchParams.set('outFields', 'gaz_id,gaz_name,gaz_featureclass,state_alpha,county_name');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('f', 'json');
  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) break;
    if (res.status >= 500 && attempt < 3) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new Error(`GNIS HTTP ${res.status} layer ${layer}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? 'GNIS error');
  const out = [];
  for (const feat of data.features ?? []) {
    const pt = feat.geometry?.points?.[0];
    if (!pt || pt.length < 2) continue;
    const lon = pt[0];
    const lat = pt[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({ ...feat.attributes, lat, lon });
  }
  return out;
}

async function queryByFeatureId(gazId) {
  for (const layer of [5, 3]) {
    const hits = await queryGnis(`gaz_id=${gazId}`, layer);
    if (hits.length) return hits;
  }
  return [];
}

async function searchGnis(gazName, stateAlpha, layers, like = false) {
  const op = like ? 'LIKE' : '=';
  const val = like ? `${escapeSql(gazName)}%` : escapeSql(gazName);
  const where = `gaz_name ${op} '${val}' AND state_alpha='${stateAlpha}'`;
  for (const layer of layers) {
    let hits = await queryGnis(where, layer);
    if (!hits.length && !like) {
      hits = await queryGnis(`gaz_name LIKE '${escapeSql(gazName)}%' AND state_alpha='${stateAlpha}'`, layer);
    }
    if (hits.length) return hits;
  }
  return [];
}

function loadLegacyWeatherRegions() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/weather-regions.json'), 'utf8'));
  const map = new Map();
  for (const region of raw.regions) {
    for (const section of region.sections) {
      for (const spot of section.spots) {
        const id = spot.id?.replace(/_/g, '-').replace(/^mt-/, 'mount-');
        if (id) map.set(id, spot);
        map.set(spot.name.toLowerCase(), spot);
      }
    }
  }
  return map;
}

function countyAllowed(county, allow) {
  if (!county || !allow.length) return true;
  return allow.some((c) => county.toLowerCase() === c.toLowerCase());
}

function distDeg(aLat, aLon, bLat, bLon) {
  return Math.hypot(aLat - bLat, aLon - bLon);
}

function parseMtnMarkers(xml) {
  const map = new Map();
  const re = /<MARKER>\s*<LAT>([^<]+)<\/LAT>\s*<LON>([^<]+)<\/LON>\s*<LOCATION>([^<]+)<\/LOCATION>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    map.set(m[3].trim().toUpperCase(), { lat: Number(m[1]), lon: Number(m[2]) });
  }
  return map;
}

async function loadMtnFcstCoords() {
  const mtnPoints = JSON.parse(fs.readFileSync(mtnPointsPath, 'utf8'));
  const offices = new Set(mtnPoints.points.map((p) => p.office));
  const byLoc = new Map();
  for (const office of offices) {
    const url =
      office === 'BTV'
        ? 'https://www.weather.gov/source/btv/rec/mtnFcst.xml'
        : office === 'ALY'
          ? 'https://www.weather.gov/source/aly/rec/mtnFcst.xml'
          : null;
    if (!url) continue;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const xml = await res.text();
    for (const [loc, coords] of parseMtnMarkers(xml)) {
      byLoc.set(`${office}:${loc}`, coords);
    }
  }
  const byPlace = new Map();
  for (const row of mtnPoints.points) {
    const key = `${row.office}:${row.loc}`;
    const hit = byLoc.get(key);
    if (hit) byPlace.set(row.placeId, { ...hit, mtnOffice: row.office, mtnLoc: row.loc });
  }
  return byPlace;
}

function pickCandidate(hits, counties, mtnCoords, elevationFt) {
  let pool = hits.filter((h) => countyAllowed(h.county_name, counties));
  if (!pool.length) pool = hits;

  if (mtnCoords && pool.length > 1) {
    pool.sort(
      (a, b) =>
        distDeg(a.lat, a.lon, mtnCoords.lat, mtnCoords.lon) -
        distDeg(b.lat, b.lon, mtnCoords.lat, mtnCoords.lon),
    );
    const best = pool[0];
    const d = distDeg(best.lat, best.lon, mtnCoords.lat, mtnCoords.lon);
    if (d < 0.08) return { pick: best, reason: 'mtnFcst-nearest' };
  }

  if (pool.length === 1) return { pick: pool[0], reason: 'single-after-filter' };

  if (elevationFt && pool.length > 1) {
    // no elev in GNIS layer — keep pool[0] if mtnFcst didn't decide
  }

  if (pool.length === 1) return { pick: pool[0], reason: 'unique' };
  return { pick: null, reason: pool.length ? 'ambiguous' : 'missing' };
}

function roundCoord(n) {
  return Math.round(n * 10000) / 10000;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = listPlaces();
  const mtnByPlace = await loadMtnFcstCoords();
  const legacy = loadLegacyWeatherRegions();
  const resolved = {};
  const flagged = [];

  for (const row of rows) {
    const alpha = STATE_ALPHA[row.stateCode];
    const counties = COUNTY_ONLY[row.id] ?? SECTION_COUNTIES[row.sectionId] ?? [];
    const layers = row.isBase ? [3, 5] : [5, 3];
    const mtn = mtnByPlace.get(row.id) ?? null;
    const gnisQueryName = GNIS_NAME[row.id] ?? cleanDisplayName(row.name);

    if (LEGACY_WEATHER_REGIONS.has(row.id)) {
      const leg =
        legacy.get(row.id) ??
        legacy.get(cleanDisplayName(row.name).toLowerCase()) ??
        (row.id === 'gunks-ridge' ? legacy.get('shawangunk-ridge') : null);
      if (leg) {
        resolved[row.id] = {
          lat: roundCoord(leg.lat),
          lon: roundCoord(leg.lon),
          source: 'config/weather-regions.json',
          gnisId: null,
          flagged: false,
          note: 'No unambiguous GNIS feature; legacy mountain-weather spot coords.',
          previous: { lat: row.lat, lon: row.lon },
        };
        await sleep(20);
        continue;
      }
    }

    let hits = [];
    const pinned = GNIS_FEATURE_ID[row.id];
    if (pinned) {
      hits = await queryByFeatureId(pinned);
    } else {
      hits = await searchGnis(gnisQueryName, alpha, layers);
    }

    const { pick, reason } = pickCandidate(hits, counties, mtn, row.elevationFt);

    if (!pick) {
      flagged.push({ id: row.id, reason, gnisQueryName, hitCount: hits.length });
      resolved[row.id] = {
        lat: row.lat,
        lon: row.lon,
        source: 'unchanged-flagged',
        flagged: true,
        gnisQueryName,
        candidates: hits.map((h) => ({
          gaz_id: h.gaz_id,
          gaz_name: h.gaz_name,
          county_name: h.county_name,
          lat: roundCoord(h.lat),
          lon: roundCoord(h.lon),
        })),
      };
    } else {
      const mtnMatch =
        mtn && distDeg(pick.lat, pick.lon, mtn.lat, mtn.lon) < 0.02 ? 'mtnFcst-ok' : mtn ? 'mtnFcst-drift' : null;
      resolved[row.id] = {
        lat: roundCoord(pick.lat),
        lon: roundCoord(pick.lon),
        gnisId: pick.gaz_id,
        gnisName: pick.gaz_name,
        gnisFeatureClass: pick.gaz_featureclass,
        county: pick.county_name,
        source: 'usgs-gnis-national-map',
        matchReason: reason,
        mtnFcstCheck: mtn
          ? { office: mtn.mtnOffice, loc: mtn.mtnLoc, lat: mtn.lat, lon: mtn.lon, status: mtnMatch }
          : null,
        previous: { lat: row.lat, lon: row.lon },
        flagged: false,
      };
    }
    await sleep(60);
  }

  const out = {
    version: 1,
    generatedNote:
      'Summit coordinates from USGS GNIS (carto.nationalmap.gov geonames MapServer). BTV/ALY mtnFcst XML used to disambiguate homonyms.',
    flaggedIds: flagged.map((f) => f.id),
    places: resolved,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

  if (apply) {
    const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
    for (const state of places.states) {
      for (const section of state.sections) {
        for (const place of section.places) {
          const hit = resolved[place.id];
          if (!hit || hit.flagged) continue;
          place.lat = hit.lat;
          place.lon = hit.lon;
        }
      }
    }
    fs.writeFileSync(placesPath, `${JSON.stringify(places, null, 2)}\n`);
    console.log(`Applied coordinates to places.json (${rows.length - flagged.length} updated, ${flagged.length} flagged).`);
  }

  console.log(`Wrote ${outPath}; flagged: ${flagged.length}`);
  if (flagged.length) console.log(JSON.stringify(flagged, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});