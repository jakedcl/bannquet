#!/usr/bin/env node
/**
 * Binds NWS observation stations to mountain places (EPQS elevation, network type, 24h weather).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const placesPath = path.join(ROOT, 'config/mountain-weather/places.json');
const nwsPointsPath = path.join(ROOT, 'config/mountain-weather/nws-points.json');
const outPath = path.join(ROOT, 'config/mountain-weather/station-bindings.json');

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

const MAX_RADIUS_KM = 80;
const MAX_VALLEY_RADIUS_KM = 95;
const MAX_NEARBY_HIGHER_MI = 15;
const CANDIDATE_LIMIT = 24;

const SUMMIT_MAX_MI = 1.0;
const SUMMIT_MAX_ELEV_DIFF_FT = 500;
const EPQS_TOLERANCE_FT = 200;
const VALLEY_MIN_BELOW_FT = 400;
const BASE_MAX_ABOVE_FT = 250;
const BASE_MAX_BELOW_FT = 2500;
const METERS_TO_FT = 3.280839895;

const WEATHER_PROP_KEYS = [
  'temperature',
  'dewpoint',
  'windSpeed',
  'windGust',
  'relativeHumidity',
  'visibility',
  'barometricPressure',
  'windChill',
  'heatIndex',
  'cloudLayers',
];

const RULE_SUMMARY =
  'Summit only for stations within 1 mi and 500 ft of catalog elevation at that summit (pinned: KMWN, A4090, A3672, MMNV1 in Mansfield pack). Nearby higher peaks use kind nearby-higher. Valley/base stations must not sit far above the place; ASOS/AWOS and RAWS preferred over CWOP. Station elevation uses USGS EPQS when NWS metadata differs by >200 ft. Bindings require a weather field (not river-only) in the last 24 h.';

/** placeId -> summit station id */
const SUMMIT_PIN_BY_PLACE = {
  'mount-washington': 'KMWN',
  'whiteface-mountain': 'A4090',
  'cadillac-mountain': 'A3672',
  'mount-mansfield': 'MMNV1',
};

/** stationId -> { placeId, peakLabel } */
const SUMMIT_STATION_PEAK = {
  KMWN: { placeId: 'mount-washington', peakLabel: 'Mount Washington' },
  A4090: { placeId: 'whiteface-mountain', peakLabel: 'Whiteface Mountain' },
  A3672: { placeId: 'cadillac-mountain', peakLabel: 'Cadillac Mountain' },
  MMNV1: { placeId: 'mount-mansfield', peakLabel: 'Mount Mansfield' },
};

const VALLEY_PIN = {
  'mount-marcy': 'KSLK',
  'whiteface-mountain': 'KSLK',
  'mount-mansfield': 'KMPV',
  'stowe-town': 'KMPV',
  'pinkham-notch': 'KHIE',
  katahdin: 'KMLT',
  millinocket: 'KMLT',
};

const ASRC_TIMELAPSE_PLACES = new Set([
  'whiteface-mountain',
  'mount-marcy',
  'algonquin-peak',
  'mount-colden',
]);

const MANSFIELD_PACK_SUMMIT = 'MMNV1';

function listPlaces() {
  const catalog = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  const nwsPoints = JSON.parse(fs.readFileSync(nwsPointsPath, 'utf8'));
  const rows = [];
  for (const state of catalog.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        const pt = nwsPoints.points?.[place.id];
        const countyState =
          typeof pt?.county === 'string' ? pt.county.match(/\/([A-Z]{2})$/)?.[1] : null;
        rows.push({
          id: place.id,
          name: place.name,
          lat: place.lat,
          lon: place.lon,
          elevationFt: place.elevationFt ?? null,
          office: place.office,
          isBase: Boolean(place.isBase),
          stateUs: countyState ?? state.code.toUpperCase(),
        });
      }
    }
  }
  return rows;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json, application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function epqsElevationFt(lat, lon) {
  const url = new URL('https://epqs.nationalmap.gov/v1/json');
  url.searchParams.set('x', String(lon));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('units', 'Feet');
  url.searchParams.set('wkid', '4326');
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`EPQS HTTP ${res.status}`);
  const data = await res.json();
  const elev = Number(data?.value);
  if (!Number.isFinite(elev)) throw new Error('EPQS missing value');
  return Math.round(elev);
}

const epqsCache = new Map();

async function getEpqsFt(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (epqsCache.has(key)) return epqsCache.get(key);
  await sleep(80);
  try {
    const v = await epqsElevationFt(lat, lon);
    epqsCache.set(key, v);
    return v;
  } catch {
    epqsCache.set(key, null);
    return null;
  }
}

function stateFromCountyHref(countyHref) {
  if (typeof countyHref !== 'string') return null;
  const m = countyHref.match(/\/zones\/county\/([A-Z]{2})C\d+/);
  return m?.[1] ?? null;
}

function classifyNetwork(stationId, provider, name) {
  const id = stationId.toUpperCase();
  const prov = (provider ?? '').toUpperCase();
  const nm = (name ?? '').toUpperCase();
  if (/^K[A-Z0-9]{3}$/.test(id)) return 'ASOS/AWOS airport';
  if (id === 'MMNV1') return 'NWS mesonet (NEPP)';
  if (/^(EW|FW|GW|CW|DW)[A-Z0-9]+$/.test(id)) return 'CWOP citizen station';
  if (prov.includes('RAWS') || nm.includes('RAWS') || /^[A-Z]{2}\d{2}$/.test(id)) {
    return 'RAWS fire-weather station';
  }
  if (
    /^(FV|AL|MR|BL|GR|MAC|BLT|GRN|USGS)/i.test(id) ||
    prov.includes('USGS') ||
    nm.includes('RIVER') ||
    nm.includes('GAUGE') ||
    nm.includes('HYDRO')
  ) {
    return 'USGS/NWS hydrologic gauge';
  }
  if (/^A\d{3,4}$/.test(id) || prov.includes('MTR') || prov.includes('NEPP')) {
    return 'NWS mesonet';
  }
  if (id.startsWith('COOP')) return 'NWS COOP';
  return 'NWS/other station';
}

function networkPriority(network) {
  const order = {
    'ASOS/AWOS airport': 0,
    'RAWS fire-weather station': 1,
    'NWS mesonet (NEPP)': 2,
    'NWS mesonet': 2,
    'NWS/other station': 3,
    'CWOP citizen station': 4,
    'USGS/NWS hydrologic gauge': 5,
    'NWS COOP': 6,
  };
  return order[network] ?? 7;
}

async function fetchNearbyStations(lat, lon) {
  const url = `https://api.weather.gov/points/${lat},${lon}/stations`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json, application/json' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = await res.json();
  return (doc.features ?? []).map((f) => {
    const p = f.properties ?? {};
    const [lonS, latS] = f.geometry?.coordinates ?? [null, null];
    const elevM = p.elevation?.value;
    return {
      id: p.stationIdentifier ?? p.stationId,
      name: p.name ?? null,
      lat: latS,
      lon: lonS,
      elevationFt: typeof elevM === 'number' ? Math.round(elevM * METERS_TO_FT) : null,
      state: p.state ?? stateFromCountyHref(p.county) ?? null,
      provider: p.provider ?? null,
    };
  });
}

function featureToStation(f) {
  const p = f.properties ?? {};
  const [lonS, latS] = f.geometry?.coordinates ?? [null, null];
  const elevM = p.elevation?.value;
  return {
    id: p.stationIdentifier ?? p.stationId,
    name: p.name ?? null,
    lat: latS,
    lon: lonS,
    elevationFt: typeof elevM === 'number' ? Math.round(elevM * METERS_TO_FT) : null,
    state: p.state ?? stateFromCountyHref(p.county) ?? null,
    provider: p.provider ?? null,
  };
}

async function fetchStateStations(stateUs) {
  const rows = [];
  let url = `https://api.weather.gov/stations?state=${stateUs}&limit=500`;
  let pages = 0;
  while (url && pages < 30) {
    await sleep(120);
    const doc = await fetchJson(url);
    const features = doc.features ?? [];
    rows.push(...features.map(featureToStation));
    url = doc.pagination?.next ?? null;
    pages += 1;
    if (features.length === 0) break;
  }
  return rows;
}

const enrichedCache = new Map();
const weatherOkCache = new Map();

function observationHasWeather(p) {
  if (!p) return false;
  for (const k of WEATHER_PROP_KEYS) {
    const v = p[k];
    if (v && typeof v === 'object' && v.value !== null && v.value !== undefined) return true;
  }
  return false;
}

async function stationHasWeatherLast24h(stationId) {
  if (weatherOkCache.has(stationId)) return weatherOkCache.get(stationId);
  await sleep(15);
  const pinnedSummit = Object.values(SUMMIT_PIN_BY_PLACE).includes(stationId);
  try {
    try {
      const latest = await fetchJson(`https://api.weather.gov/stations/${stationId}/observations/latest`);
      const p = latest.properties ?? {};
      const ts = Date.parse(p.timestamp ?? '');
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      if (Number.isFinite(ts) && ts >= cutoff && observationHasWeather(p)) {
        weatherOkCache.set(stationId, true);
        return true;
      }
    } catch {
      /* latest missing */
    }
    const doc = await fetchJson(
      `https://api.weather.gov/stations/${stationId}/observations?limit=48`,
    );
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let ok = false;
    for (const f of doc.features ?? []) {
      const p = f.properties ?? {};
      const ts = Date.parse(p.timestamp ?? '');
      if (!Number.isFinite(ts) || ts < cutoff) continue;
      if (observationHasWeather(p)) {
        ok = true;
        break;
      }
    }
    if (!ok && pinnedSummit) ok = true;
    weatherOkCache.set(stationId, ok);
    return ok;
  } catch {
    weatherOkCache.set(stationId, false);
    return false;
  }
}

async function enrichStation(stationId, hint) {
  if (enrichedCache.has(stationId)) return enrichedCache.get(stationId);
  await sleep(10);
  try {
    const doc = await fetchJson(`https://api.weather.gov/stations/${stationId}`);
    const p = doc.properties ?? {};
    const elevM = p.elevation?.value;
    const nwsElevationFt = typeof elevM === 'number' ? Math.round(elevM * METERS_TO_FT) : (hint?.elevationFt ?? null);
    const coords = doc.geometry?.coordinates ?? [];
    const lat = coords[1] ?? hint?.lat ?? null;
    const lon = coords[0] ?? hint?.lon ?? null;
    let office = null;
    let state = stateFromCountyHref(p.county) ?? hint?.state ?? null;
    const provider = typeof p.provider === 'string' ? p.provider : hint?.provider ?? null;
    const name = typeof p.name === 'string' ? p.name : hint?.name ?? null;
    if (lat !== null && lon !== null) {
      try {
        const pt = await fetchJson(`https://api.weather.gov/points/${lat},${lon}`);
        office = pt.properties?.cwa ?? null;
        if (!state && typeof pt.properties?.county === 'string') {
          state = stateFromCountyHref(pt.properties.county);
        }
      } catch {
        /* ignore */
      }
    }
    let epqsElevationFtVal = lat != null && lon != null ? await getEpqsFt(lat, lon) : null;
    let elevationFt = nwsElevationFt;
    let elevationSource = 'NWS metadata';
    if (epqsElevationFtVal !== null && nwsElevationFt !== null) {
      const delta = Math.abs(epqsElevationFtVal - nwsElevationFt);
      if (delta > EPQS_TOLERANCE_FT) {
        elevationFt = epqsElevationFtVal;
        elevationSource = 'USGS EPQS (NWS metadata rejected)';
      }
    } else if (epqsElevationFtVal !== null && nwsElevationFt === null) {
      elevationFt = epqsElevationFtVal;
      elevationSource = 'USGS EPQS';
    }
    const network = classifyNetwork(stationId, provider, name);
    const hasWeather = await stationHasWeatherLast24h(stationId);
    const meta = {
      id: stationId,
      name,
      lat,
      lon,
      nwsElevationFt,
      epqsElevationFt: epqsElevationFtVal,
      elevationFt,
      elevationSource,
      state,
      office,
      provider,
      network,
      hasWeatherLast24h: hasWeather,
    };
    enrichedCache.set(stationId, meta);
    return meta;
  } catch (err) {
    const fail = { id: stationId, error: String(err) };
    enrichedCache.set(stationId, fail);
    return fail;
  }
}

function officeMatches(placeOffice, stationOffice) {
  return stationOffice === placeOffice;
}

function stateMatches(placeStateUs, stationState) {
  if (!stationState) return false;
  return stationState.toUpperCase() === placeStateUs.toUpperCase();
}

function nearestCandidates(place, pool, maxKm, cap) {
  return pool
    .filter((s) => s.id && s.lat != null && s.lon != null)
    .map((s) => ({
      ...s,
      distanceKm: haversineKm(place.lat, place.lon, s.lat, s.lon),
    }))
    .filter((s) => s.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, cap);
}

function qualifiesAsSummit(place, meta, distanceMi) {
  if (place.elevationFt === null || meta.elevationFt === null) return false;
  return distanceMi <= SUMMIT_MAX_MI && Math.abs(place.elevationFt - meta.elevationFt) <= SUMMIT_MAX_ELEV_DIFF_FT;
}

function qualifiesValleyOrBase(place, meta) {
  if (place.elevationFt === null || meta.elevationFt === null) return place.isBase;
  if (place.isBase) {
    const above = meta.elevationFt - place.elevationFt;
    const below = place.elevationFt - meta.elevationFt;
    return above <= BASE_MAX_ABOVE_FT && below <= BASE_MAX_BELOW_FT;
  }
  return meta.elevationFt <= place.elevationFt - VALLEY_MIN_BELOW_FT;
}

function buildBindReason(place, meta, distanceMi, kind, extra) {
  const elevNote =
    meta.elevationSource === 'USGS EPQS (NWS metadata rejected)'
      ? `${meta.elevationFt} ft (${meta.elevationSource}; NWS had ${meta.nwsElevationFt ?? 'null'} ft)`
      : `${meta.elevationFt ?? 'null'} ft (${meta.elevationSource})`;
  const diff =
    place.elevationFt !== null && meta.elevationFt !== null ? place.elevationFt - meta.elevationFt : null;
  const diffNote =
    diff === null
      ? ''
      : diff >= 0
        ? `; station ${diff.toLocaleString('en-US')} ft below catalog`
        : `; station ${Math.abs(diff).toLocaleString('en-US')} ft above catalog`;
  const tail = extra ? ` ${extra}` : '';
  return `${meta.network} ${meta.id} at ${elevNote}, ${distanceMi} mi, WFO ${place.office}/${place.stateUs}${diffNote}. ${kind}.${tail}`;
}

async function buildForPlace(place, nearbyCache, statePools, enriched) {
  const cacheKey = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  let pool = nearbyCache.get(cacheKey);
  if (!pool) {
    const pointList = await fetchNearbyStations(place.lat, place.lon);
    const stateList = statePools.get(place.stateUs) ?? [];
    const byId = new Map();
    for (const s of [...pointList, ...stateList]) {
      if (s.id) byId.set(s.id, s);
    }
    pool = [...byId.values()];
    nearbyCache.set(cacheKey, pool);
    await sleep(80);
  }

  const observations = [];
  const used = new Set();

  async function tryAdd(stationId, kind, _hint, extraReason) {
    if (used.has(stationId)) return;
    const meta = enriched.get(stationId);
    if (!meta) return;
    if (meta.error || meta.lat == null) return;
    if (!meta.hasWeatherLast24h && SUMMIT_PIN_BY_PLACE[place.id] !== stationId) return;
    if (!officeMatches(place.office, meta.office) || !stateMatches(place.stateUs, meta.state)) return;
    const distanceMi = Math.round(haversineKm(place.lat, place.lon, meta.lat, meta.lon) * 621.371) / 1000;
    const elevationDiffFt =
      place.elevationFt !== null && meta.elevationFt !== null ? place.elevationFt - meta.elevationFt : null;
    const peak = SUMMIT_STATION_PEAK[stationId];
    let finalKind = kind;
    let extra = extraReason ?? '';
    if (kind === 'summit' && peak && peak.placeId !== place.id) {
      finalKind = 'nearby-higher';
      extra = `Nearby higher station: ${peak.peakLabel}.`;
    } else if (kind === 'summit' && !qualifiesAsSummit(place, meta, distanceMi) && SUMMIT_PIN_BY_PLACE[place.id] !== stationId) {
      return;
    }
    if ((finalKind === 'valley' || finalKind === 'base') && !qualifiesValleyOrBase(place, meta)) return;

    observations.push({
      stationId: meta.id,
      kind: finalKind,
      network: meta.network,
      stationName: meta.name,
      stationElevationFt: meta.elevationFt,
      elevationSource: meta.elevationSource,
      nwsElevationFt: meta.nwsElevationFt,
      epqsElevationFt: meta.epqsElevationFt,
      distanceMi,
      elevationDiffFt,
      bindReason: buildBindReason(place, meta, distanceMi, finalKind, extra),
      hideFromObservationsSection:
        stationId === MANSFIELD_PACK_SUMMIT && place.id === 'mount-mansfield' && finalKind === 'summit',
    });
    used.add(stationId);
  }

  const summitPin = SUMMIT_PIN_BY_PLACE[place.id];
  if (summitPin && !place.isBase) {
    const hint = pool.find((s) => s.id === summitPin);
    await tryAdd(summitPin, 'summit', hint, 'Pinned summit station for this peak.');
  }

  if (!place.isBase) {
    for (const [sid, peak] of Object.entries(SUMMIT_STATION_PEAK)) {
      if (peak.placeId === place.id || used.has(sid)) continue;
      const hint = pool.find((s) => s.id === sid);
      if (!hint) continue;
      const meta = enriched.get(sid);
      if (!meta || meta.error) continue;
      const distanceMi = haversineKm(place.lat, place.lon, meta.lat, meta.lon) * 0.621371;
      if (distanceMi > MAX_NEARBY_HIGHER_MI) continue;
      if (meta.elevationFt != null && place.elevationFt != null && meta.elevationFt <= place.elevationFt + 200) {
        continue;
      }
      await tryAdd(sid, 'nearby-higher', hint, `Nearby higher station: ${peak.peakLabel}.`);
    }
  }

  const valleyPin = VALLEY_PIN[place.id];
  if (valleyPin) {
    const hint = pool.find((s) => s.id === valleyPin) ?? (statePools.get(place.stateUs) ?? []).find((s) => s.id === valleyPin);
    await tryAdd(valleyPin, place.isBase ? 'base' : 'valley', hint, 'Pinned valley/base METAR.');
  } else {
    const maxKm = place.isBase ? MAX_RADIUS_KM : MAX_VALLEY_RADIUS_KM;
    const candidates = nearestCandidates(
      place,
      pool.filter((s) => !used.has(s.id)),
      maxKm,
      CANDIDATE_LIMIT,
    );
    let best = null;
    for (const cand of candidates) {
      const meta = enriched.get(cand.id);
      if (!meta || meta.error || !meta.hasWeatherLast24h) continue;
      if (!officeMatches(place.office, meta.office) || !stateMatches(place.stateUs, meta.state)) continue;
      if (SUMMIT_STATION_PEAK[cand.id]) continue;
      if (!qualifiesValleyOrBase(place, meta)) continue;
      const distMi = cand.distanceKm * 0.621371;
      const score = networkPriority(meta.network) * 100 + cand.distanceKm;
      if (!best || score < best.score) best = { cand, meta, score, distMi };
    }
    if (best) {
      await tryAdd(
        best.meta.id,
        place.isBase ? 'base' : 'valley',
        best.cand,
        'Auto: nearest qualifying station with weather in 24 h.',
      );
    }
  }

  const visible = observations.filter((o) => !o.hideFromObservationsSection);
  return {
    asrcTimelapse: ASRC_TIMELAPSE_PLACES.has(place.id),
    observations,
    hasSection: visible.length > 0 || ASRC_TIMELAPSE_PLACES.has(place.id),
  };
}

function collectStationIdsForPlace(place, pool) {
  const ids = new Set();
  const pin = SUMMIT_PIN_BY_PLACE[place.id];
  if (pin) ids.add(pin);
  const valley = VALLEY_PIN[place.id];
  if (valley) ids.add(valley);
  for (const sid of Object.keys(SUMMIT_STATION_PEAK)) ids.add(sid);
  for (const cand of nearestCandidates(place, pool, MAX_VALLEY_RADIUS_KM, 30)) {
    const id = cand.id;
    if (/^K[A-Z0-9]{3}$/.test(id) || /^A\d{3,4}$/.test(id) || /^[A-Z]{2,4}\d{1,2}$/.test(id)) ids.add(id);
  }
  return ids;
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const places = listPlaces();
  const statePools = new Map();
  const hintById = new Map();
  for (const st of ['NY', 'VT', 'NH', 'ME']) {
    console.log(`Loading ${st} station list…`);
    const rows = await fetchStateStations(st);
    statePools.set(st, rows);
    for (const s of rows) {
      if (s.id && !hintById.has(s.id)) hintById.set(s.id, s);
    }
  }
  const nearbyCache = new Map();
  const idsToEnrich = new Set();
  for (const place of places) {
    const cacheKey = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
    let pool = nearbyCache.get(cacheKey);
    if (!pool) {
      const pointList = await fetchNearbyStations(place.lat, place.lon);
      const stateList = statePools.get(place.stateUs) ?? [];
      const byId = new Map();
      for (const s of [...pointList, ...stateList]) {
        if (s.id) byId.set(s.id, s);
      }
      pool = [...byId.values()];
      nearbyCache.set(cacheKey, pool);
      await sleep(60);
    }
    for (const id of collectStationIdsForPlace(place, pool)) idsToEnrich.add(id);
  }
  console.log(`Enriching ${idsToEnrich.size} candidate stations…`);
  const enriched = new Map();
  const idList = [...idsToEnrich];
  let done = 0;
  await mapPool(idList, 8, async (stationId) => {
    const meta = await enrichStation(stationId, hintById.get(stationId));
    enriched.set(stationId, meta);
    done += 1;
    if (done % 25 === 0) console.log(`  ${done}/${idList.length}`);
  });
  const placeBindings = {};
  const stations = {};
  const audit = [];

  for (const place of places) {
    const binding = await buildForPlace(place, nearbyCache, statePools, enriched);
    for (const obs of binding.observations) {
      const meta = enriched.get(obs.stationId);
      if (meta && !meta.error) {
        stations[obs.stationId] = {
          id: meta.id,
          name: meta.name,
          lat: meta.lat,
          lon: meta.lon,
          elevationFt: meta.elevationFt,
          nwsElevationFt: meta.nwsElevationFt,
          epqsElevationFt: meta.epqsElevationFt,
          elevationSource: meta.elevationSource,
          network: meta.network,
          state: meta.state,
          office: meta.office,
          hasWeatherLast24h: meta.hasWeatherLast24h,
        };
      }
      if (!obs.hideFromObservationsSection) {
        audit.push({
          place: place.id,
          station: obs.stationId,
          network: obs.network,
          kind: obs.kind,
          distanceMi: obs.distanceMi,
          elevationDiffFt: obs.elevationDiffFt,
        });
      }
    }
    const visibleObs = binding.observations.filter((o) => !o.hideFromObservationsSection);
    if (visibleObs.length > 0 || binding.asrcTimelapse) {
      placeBindings[place.id] = {
        asrcTimelapse: binding.asrcTimelapse,
        observations: binding.observations,
      };
    }
  }

  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    ruleSummary: RULE_SUMMARY,
    stations,
    places: placeBindings,
    audit,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `Wrote ${outPath} — ${Object.keys(placeBindings).length} places, ${Object.keys(stations).length} stations, ${audit.length} visible bindings`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});