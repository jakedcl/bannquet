#!/usr/bin/env node
/**
 * Binds NWS observation stations to mountain places using station metadata from
 * api.weather.gov/stations (coordinates, elevation, forecast office, state).
 * Writes config/mountain-weather/station-bindings.json.
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
const MAX_SUMMIT_DISTANCE_KM = 20;
const CANDIDATE_LIMIT = 12;
/** ASOS/METAR and co-located NWS mountaintop ids; excludes COOP* citizen science. */
const STATION_ID_OK = /^(K[A-Z0-9]{3}|[A-Z]\d{3,4}|[A-Z]{2,4}\d{1,2})$/;
const VALLEY_ID_PREFERRED = /^K[A-Z0-9]{3}$/;
/** Summit bind: station within this many ft of place elevation (or higher). */
const SUMMIT_ELEV_WINDOW_FT = 900;
/** Valley label: station at least this many ft below a summit place. */
const VALLEY_ELEV_DEFICIT_FT = 700;
const METERS_TO_FT = 3.280839895;

const RULE_SUMMARY =
  'Nearest ASOS/METAR-style NWS station with same state and WFO as the place; summit slot only within 20 km when station elevation is within 900 ft of catalog summit elevation (or higher). Optional valley slot is the nearest qualifying station at least 700 ft lower (up to 95 km). Manual summit pins for KMWN and MMNV1. MMNV1 is shown only in the Mansfield pack, not duplicated here. Places with no qualifying station within radius have no observation block.';

/** Station id -> place ids that must use this as summit (verified coords/elev from NWS stations API). */
const MANUAL_SUMMIT = {
  KMWN: ['mount-washington'],
  MMNV1: ['mount-mansfield'],
};

const VALLEY_PIN = {
  'mount-marcy': 'KSLK',
  'whiteface-mountain': 'KSLK',
  'mount-mansfield': 'KMPV',
  'stowe-town': 'KMPV',
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
          stateSlug: state.code,
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

async function fetchNearbyStations(lat, lon) {
  const url = `https://api.weather.gov/points/${lat},${lon}/stations`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json, application/json' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = await res.json();
  const features = doc.features ?? [];
  return features.map((f) => {
    const p = f.properties ?? {};
    const [lonS, latS] = f.geometry?.coordinates ?? [null, null];
    const elevM = p.elevation?.value;
    return {
      id: p.stationIdentifier ?? p.stationId,
      name: p.name ?? null,
      lat: latS,
      lon: lonS,
      elevationFt: typeof elevM === 'number' ? Math.round(elevM * METERS_TO_FT) : null,
      state: p.state ?? null,
      forecastOffice: null,
    };
  });
}

const stationMetaCache = new Map();
const stateStationCache = new Map();

function stateFromCountyHref(countyHref) {
  if (typeof countyHref !== 'string') return null;
  const m = countyHref.match(/\/zones\/county\/([A-Z]{2})C\d+/);
  return m?.[1] ?? null;
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
    forecastOffice: null,
  };
}

async function fetchStateStations(stateUs) {
  if (stateStationCache.has(stateUs)) return stateStationCache.get(stateUs);
  const rows = [];
  let url = `https://api.weather.gov/stations?state=${stateUs}&limit=500`;
  let pages = 0;
  while (url && pages < 30) {
    await sleep(150);
    const doc = await fetchJson(url);
    const features = doc.features ?? [];
    rows.push(...features.map(featureToStation));
    url = doc.pagination?.next ?? null;
    pages += 1;
    if (features.length === 0) break;
  }
  stateStationCache.set(stateUs, rows);
  return rows;
}

async function loadStationMeta(stationId, hint) {
  if (stationMetaCache.has(stationId)) return stationMetaCache.get(stationId);
  if (hint?.lat != null && hint?.lon != null && stationMetaCache.has(`${stationId}:pt`)) {
    const ptOnly = stationMetaCache.get(`${stationId}:pt`);
    if (ptOnly.office && ptOnly.state) {
      stationMetaCache.set(stationId, { ...ptOnly, id: stationId, ...hint });
      return stationMetaCache.get(stationId);
    }
  }
  await sleep(60);
  try {
    const doc = await fetchJson(`https://api.weather.gov/stations/${stationId}`);
    const p = doc.properties ?? {};
    const elevM = p.elevation?.value;
    const coords = doc.geometry?.coordinates ?? [];
    const lat = coords[1] ?? null;
    const lon = coords[0] ?? null;
    let office = null;
    let state = stateFromCountyHref(p.county);
    if (lat !== null && lon !== null) {
      await sleep(80);
      try {
        const pt = await fetchJson(`https://api.weather.gov/points/${lat},${lon}`);
        const pp = pt.properties ?? {};
        office = typeof pp.cwa === 'string' ? pp.cwa : null;
        if (!state && typeof pp.county === 'string') state = stateFromCountyHref(pp.county);
      } catch {
        // point lookup may fail for offshore stations
      }
    }
    const meta = {
      id: stationId,
      name: p.name ?? hint?.name ?? null,
      lat: lat ?? hint?.lat ?? null,
      lon: lon ?? hint?.lon ?? null,
      elevationFt:
        typeof elevM === 'number'
          ? Math.round(elevM * METERS_TO_FT)
          : (hint?.elevationFt ?? null),
      state,
      office,
    };
    stationMetaCache.set(stationId, meta);
    return meta;
  } catch (err) {
    const meta = { id: stationId, error: String(err) };
    stationMetaCache.set(stationId, meta);
    return meta;
  }
}

function officeMatches(placeOffice, stationOffice) {
  return stationOffice === placeOffice;
}

function stateMatches(placeStateUs, stationState) {
  if (!stationState) return false;
  return stationState.toUpperCase() === placeStateUs.toUpperCase();
}

function summitEligible(place, meta, distanceKm) {
  if (place.elevationFt === null || meta.elevationFt === null) {
    return distanceKm <= 15;
  }
  const diff = place.elevationFt - meta.elevationFt;
  return meta.elevationFt >= place.elevationFt - SUMMIT_ELEV_WINDOW_FT && diff <= SUMMIT_ELEV_WINDOW_FT * 2;
}

function valleyEligible(place, meta) {
  if (place.isBase) return true;
  if (place.elevationFt === null || meta.elevationFt === null) return false;
  return place.elevationFt - meta.elevationFt >= VALLEY_ELEV_DEFICIT_FT;
}

function bindReason(place, meta, distanceKm, kind) {
  const distMi = (distanceKm * 0.621371).toFixed(1);
  const elev =
    meta.elevationFt !== null
      ? `${meta.elevationFt.toLocaleString('en-US')} ft station elev`
      : 'unknown station elev';
  const placeElev =
    place.elevationFt !== null ? `${place.elevationFt.toLocaleString('en-US')} ft catalog` : 'unknown catalog elev';
  const diff =
    place.elevationFt !== null && meta.elevationFt !== null
      ? place.elevationFt - meta.elevationFt
      : null;
  const diffNote =
    diff !== null
      ? diff >= 0
        ? `station is ${diff.toLocaleString('en-US')} ft lower than catalog`
        : `station is ${Math.abs(diff).toLocaleString('en-US')} ft higher than catalog`
      : '';
  if (kind === 'summit') {
    return `${meta.id} (${elev}) is ${distMi} mi from ${place.name}; same WFO ${place.office} and state ${place.stateUs}; ${diffNote}. Summit slot: elevation within ${SUMMIT_ELEV_WINDOW_FT} ft of ${placeElev}.`;
  }
  return `${meta.id} (${elev}) is ${distMi} mi from ${place.name}; same WFO ${place.office} and state ${place.stateUs}; ${diffNote}. Valley/nearby slot: at least ${VALLEY_ELEV_DEFICIT_FT} ft below summit catalog (or base-area nearest METAR).`;
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

async function buildForPlace(place, nearbyCache, statePools) {
  const cacheKey = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  let nearby = nearbyCache.get(cacheKey);
  if (!nearby) {
    const pointList = await fetchNearbyStations(place.lat, place.lon);
  const stateList = statePools.get(place.stateUs) ?? [];
    const byId = new Map();
    for (const s of [...pointList, ...stateList]) {
      if (s.id) byId.set(s.id, s);
    }
    nearby = [...byId.values()];
    nearbyCache.set(cacheKey, nearby);
    await sleep(120);
  }

  const pool = nearby;

  const manualSummitId = Object.entries(MANUAL_SUMMIT).find(([, ids]) => ids.includes(place.id))?.[0] ?? null;
  const manualValleyId = VALLEY_PIN[place.id] ?? null;

  const observations = [];
  const stationsUsed = new Set();

  async function addStation(stationId, kind, reasonExtra, hint) {
    const meta = await loadStationMeta(stationId, hint);
    if (meta.error || meta.lat === null) return;
    if (!officeMatches(place.office, meta.office) || !stateMatches(place.stateUs, meta.state)) return;
    const distanceKm = haversineKm(place.lat, place.lon, meta.lat, meta.lon);
    const distanceMi = Math.round(distanceKm * 0.621371 * 10) / 10;
    const elevationDiffFt =
      place.elevationFt !== null && meta.elevationFt !== null ? place.elevationFt - meta.elevationFt : null;
    observations.push({
      stationId: meta.id,
      kind,
      stationName: meta.name,
      stationElevationFt: meta.elevationFt,
      distanceMi,
      elevationDiffFt,
      bindReason: reasonExtra ?? bindReason(place, meta, distanceKm, kind),
      hideFromObservationsSection: kind === 'summit' && stationId === MANSFIELD_PACK_SUMMIT && place.id === 'mount-mansfield',
    });
    stationsUsed.add(meta.id);
  }

  if (manualSummitId) {
    const hint = pool.find((s) => s.id === manualSummitId);
    await addStation(
      manualSummitId,
      'summit',
      `Manual summit pin: NWS station metadata at api.weather.gov/stations/${manualSummitId}.`,
      hint,
    );
  } else if (!place.isBase) {
    const candidates = nearestCandidates(place, pool, MAX_SUMMIT_DISTANCE_KM, CANDIDATE_LIMIT).filter((s) =>
      STATION_ID_OK.test(s.id),
    );
    let best = null;
    for (const cand of candidates) {
      const meta = await loadStationMeta(cand.id, cand);
      if (meta.error) continue;
      if (!officeMatches(place.office, meta.office) || !stateMatches(place.stateUs, meta.state)) continue;
      if (cand.distanceKm > MAX_SUMMIT_DISTANCE_KM) continue;
      if (!summitEligible(place, meta, cand.distanceKm)) continue;
      const score =
        cand.distanceKm +
        Math.abs((place.elevationFt ?? meta.elevationFt ?? 0) - (meta.elevationFt ?? 0)) / 2000;
      if (!best || score < best.score) best = { meta, distanceKm: cand.distanceKm, score, cand };
    }
    if (best) await addStation(best.meta.id, 'summit', undefined, best.cand);
  }

  const valleyId = manualValleyId;
  if (valleyId) {
    const hint = pool.find((s) => s.id === valleyId) ?? (statePools.get(place.stateUs) ?? []).find((s) => s.id === valleyId);
    await addStation(valleyId, 'valley', `Manual valley/nearby METAR pin for ${place.name}.`, hint);
  } else {
    const maxR = place.isBase ? MAX_RADIUS_KM : MAX_VALLEY_RADIUS_KM;
    const valleyPool = pool.filter((s) => !stationsUsed.has(s.id) && (VALLEY_ID_PREFERRED.test(s.id) || STATION_ID_OK.test(s.id)));
    const candidates = nearestCandidates(place, valleyPool, maxR, CANDIDATE_LIMIT).filter(
      (s) => VALLEY_ID_PREFERRED.test(s.id) || STATION_ID_OK.test(s.id),
    );
    let bestValley = null;
    for (const cand of candidates) {
      const meta = await loadStationMeta(cand.id, cand);
      if (meta.error) continue;
      if (!officeMatches(place.office, meta.office) || !stateMatches(place.stateUs, meta.state)) continue;
      if (!valleyEligible(place, meta)) continue;
      if (!place.isBase && summitEligible(place, meta, cand.distanceKm)) continue;
      if (!bestValley || cand.distanceKm < bestValley.distanceKm) bestValley = { meta, distanceKm: cand.distanceKm, cand };
    }
    if (bestValley) {
      const kind = place.isBase ? 'base' : 'valley';
      await addStation(bestValley.meta.id, kind, undefined, bestValley.cand);
    } else if (place.isBase) {
      const candidatesBase = nearestCandidates(place, pool, MAX_RADIUS_KM, 6);
      const cand = candidatesBase[0];
      if (cand) {
        const meta = await loadStationMeta(cand.id, cand);
        if (
          !meta.error &&
          officeMatches(place.office, meta.office) &&
          stateMatches(place.stateUs, meta.state)
        ) {
          await addStation(meta.id, 'base', undefined, cand);
        }
      }
    }
  }

  const visible = observations.filter((o) => !o.hideFromObservationsSection);
  return {
    asrcTimelapse: ASRC_TIMELAPSE_PLACES.has(place.id),
    observations,
    hasSection: visible.length > 0 || ASRC_TIMELAPSE_PLACES.has(place.id),
  };
}

async function main() {
  const places = listPlaces();
  const nearbyCache = new Map();
  const placeBindings = {};
  const stations = {};
  const statePools = new Map();
  for (const st of ['NY', 'VT', 'NH', 'ME']) {
    console.log(`Loading ${st} station list…`);
    statePools.set(st, await fetchStateStations(st));
    console.log(`  ${statePools.get(st).length} stations`);
  }

  for (const place of places) {
    const binding = await buildForPlace(place, nearbyCache, statePools);
    for (const obs of binding.observations) {
      const meta = stationMetaCache.get(obs.stationId);
      if (meta && !meta.error) {
        stations[obs.stationId] = {
          id: meta.id,
          name: meta.name,
          lat: meta.lat,
          lon: meta.lon,
          elevationFt: meta.elevationFt,
          state: meta.state,
          office: meta.office,
        };
      }
    }
    const visibleObs = binding.observations.filter((o) => !o.hideFromObservationsSection);
    const hasSection = visibleObs.length > 0 || binding.asrcTimelapse;
    if (hasSection) {
      placeBindings[place.id] = {
        asrcTimelapse: binding.asrcTimelapse,
        observations: binding.observations,
      };
    }
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    ruleSummary: RULE_SUMMARY,
    stations,
    places: placeBindings,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  const withObs = Object.values(placeBindings).filter((p) =>
    p.observations.some((o) => !o.hideFromObservationsSection),
  ).length;
  console.log(`Wrote ${outPath} — ${Object.keys(placeBindings).length} places with section, ${withObs} with NWS obs blocks, ${Object.keys(stations).length} unique stations`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});