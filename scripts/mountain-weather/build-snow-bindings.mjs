#!/usr/bin/env node
/**
 * Snow measured bindings: M10 observation rules + multi-day NOHRSC station catalog + EPQS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import placeCoords from '../../config/mountain-weather/place-coordinates.json' with { type: 'json' };
import placesCatalog from '../../config/mountain-weather/places.json' with { type: 'json' };
import stationBindings from '../../config/mountain-weather/station-bindings.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = path.join(ROOT, 'config/mountain-weather/snow-nohrsc-station-catalog.json');
const snapshotPath = path.join(ROOT, 'config/mountain-weather/snow-nohrsc-snapshot.json');
const epqsCachePath = path.join(ROOT, 'config/mountain-weather/snow-station-epqs-cache.json');
const outPath = path.join(ROOT, 'config/mountain-weather/snow-measured-bindings.json');

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

const MAX_BIND_MI = 40;
const DISTANT_MI = 25;
const SUMMIT_MAX_MI = 1.05;
const SUMMIT_MAX_ELEV_FT = 500;
const EPQS_TOLERANCE_FT = 200;
const BASE_MAX_ABOVE_FT = 250;
const BASE_MAX_BELOW_FT = 2500;
const VALLEY_MIN_BELOW_FT = 400;
const MAX_NEARBY_HIGHER_MI = 15;
const MAX_BINDINGS = 4;
const LOOKBACK_HOURS = 7 * 24;
const MAX_SNAPSHOT_FETCHES = 8;
const REPORT_STALE_DAYS = 7;

const SUMMIT_PIN_BY_PLACE = {
  'mount-washington': 'KMWN',
  'whiteface-mountain': 'A4090',
  'cadillac-mountain': 'A3672',
  'mount-mansfield': 'MMNV1',
};

const SUMMIT_STATION_PEAK = {
  KMWN: { placeId: 'mount-washington', peakLabel: 'Mount Washington' },
  MWN: { placeId: 'mount-washington', peakLabel: 'Mount Washington (NOHRSC duplicate ID)' },
  A4090: { placeId: 'whiteface-mountain', peakLabel: 'Whiteface Mountain' },
  A3672: { placeId: 'cadillac-mountain', peakLabel: 'Cadillac Mountain' },
  MMNV1: { placeId: 'mount-mansfield', peakLabel: 'Mount Mansfield' },
};

const RULE_SUMMARY =
  'Measured snow bindings follow M10 observation rules: summit only within 1 mi and 500 ft or pinned KMWN/A4090/A3672/MMNV1; base/valley stations must not sit more than 250 ft above the place; nearby-higher for high summits (e.g. MWN/KMWN at Pinkham/Stowe). Station elevation uses USGS EPQS when NOHRSC table elevation differs by >200 ft. Station catalog is the union of NOHRSC Northeast snowdepth tables over the last 7 days. Runtime shows the latest table row per bound station or “no report in the last 7 days.”';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function haversineMi(lat1, lon1, lat2, lon2) {
  const r = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function listPlaces() {
  const rows = [];
  for (const state of placesCatalog.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        const c = placeCoords.places[place.id];
        if (!c) continue;
        rows.push({
          id: place.id,
          name: place.name,
          lat: c.lat,
          lon: c.lon,
          elevationFt: place.elevationFt ?? null,
          isBase: Boolean(place.isBase),
          office: place.office,
        });
      }
    }
  }
  return rows;
}

function parseNohrscRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('!') || line.startsWith('Station_Id')) continue;
    const p = line.split('|');
    if (p.length < 9) continue;
    const elevM = p[4]?.match(/([\d.]+)\s*feet/i);
    const amount = Number(p[7]);
    rows.push({
      stationId: p[0].trim(),
      name: p[1].trim(),
      lat: Number(p[2]),
      lon: Number(p[3]),
      nohrscElevationFt: elevM ? Math.round(Number(elevM[1])) : null,
      element: /snowdepth/i.test(p[5]) ? 'snowdepth' : 'unknown',
      reportTimeUtc: p[6]?.trim() ?? null,
      amountIn: Number.isFinite(amount) ? amount : null,
      source: p[0].includes('-') ? 'COCORAHS' : 'NOHRSC',
    });
  }
  return rows;
}

function classifyNetwork(stationId, name) {
  if (stationId.includes('-')) return 'CoCoRaHS';
  if (/^K[A-Z0-9]{3}$/.test(stationId)) return 'ASOS/AWOS airport';
  if (stationId === 'MMNV1') return 'NWS mesonet (NEPP)';
  if (/^[A-Z]\d{3,4}$/.test(stationId)) return 'RAWS';
  if (stationId === 'MWN' || stationId === 'KMWN') return 'NOHRSC summit (verify vs KMWN ASOS)';
  return 'NOHRSC';
}

async function epqsElevationFt(lat, lon) {
  const url = new URL('https://epqs.nationalmap.gov/v1/json');
  url.searchParams.set('x', String(lon));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('units', 'Feet');
  url.searchParams.set('wkid', '4326');
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`EPQS HTTP ${res.status}`);
  const data = await res.json();
  const elev = Number(data?.value);
  if (!Number.isFinite(elev)) throw new Error('EPQS missing value');
  return Math.round(elev);
}

function loadEpqsCache() {
  if (!fs.existsSync(epqsCachePath)) return {};
  return JSON.parse(fs.readFileSync(epqsCachePath, 'utf8'));
}

function saveEpqsCache(cache) {
  fs.writeFileSync(epqsCachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

async function getEpqsFt(lat, lon, cache) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache[key] !== undefined) return cache[key];
  await sleep(15);
  try {
    const v = await epqsElevationFt(lat, lon);
    cache[key] = v;
    return v;
  } catch {
    cache[key] = null;
    return null;
  }
}

function resolveElevation(nohrscElev, epqsElev) {
  if (epqsElev !== null && nohrscElev !== null) {
    if (Math.abs(epqsElev - nohrscElev) > EPQS_TOLERANCE_FT) {
      return {
        elevationFt: epqsElev,
        elevationSource: 'USGS EPQS (NOHRSC table elevation rejected)',
        nohrscElevationFt: nohrscElev,
        epqsElevationFt: epqsElev,
      };
    }
    return {
      elevationFt: nohrscElev,
      elevationSource: 'NOHRSC table (EPQS agrees)',
      nohrscElevationFt: nohrscElev,
      epqsElevationFt: epqsElev,
    };
  }
  if (epqsElev !== null) {
    return { elevationFt: epqsElev, elevationSource: 'USGS EPQS', nohrscElevationFt: nohrscElev, epqsElevationFt: epqsElev };
  }
  return { elevationFt: nohrscElev, elevationSource: 'NOHRSC table', nohrscElevationFt: nohrscElev, epqsElevationFt: null };
}

async function collectReportTokens() {
  const reportsRes = await fetch(
    'https://www.nohrsc.noaa.gov/nsa/reports.html?region=Northeast&var=snowdepth',
    { headers: { 'User-Agent': USER_AGENT } },
  );
  const html = await reportsRes.text();
  const fromPage = [...html.matchAll(/snowdepth_(\d{10})/g)].map((m) => m[1]);
  const latest = fromPage[0];
  if (!latest) throw new Error('No NOHRSC tokens on reports page');
  const tokens = new Set(fromPage);
  const base = latest.slice(0, 8);
  const hour = Number(latest.slice(8, 10));
  for (let h = 0; h < LOOKBACK_HOURS; h += 6) {
    const hh = String(Math.max(0, hour - h)).padStart(2, '0');
    tokens.add(`${base}${hh}`);
  }
  return [...tokens];
}

async function buildMultiDayCatalog() {
  const tokens = await collectReportTokens();
  const catalog = new Map();
  const snapshots = [];
  let latestUrl = '';
  let latestToken = '';
  let latestText = '';
  for (const token of [...new Set(tokens)].slice(0, MAX_SNAPSHOT_FETCHES)) {
    const yyyymm = token.slice(0, 6);
    const url = `https://www.nohrsc.noaa.gov/nsa/discussions_text/Northeast/snowdepth/${yyyymm}/snowdepth_${token}_e.txt`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) continue;
    const text = await res.text();
    const rows = parseNohrscRows(text);
    snapshots.push({ token, url, rowCount: rows.length });
    if (!latestText) {
      latestText = text;
      latestUrl = url;
      latestToken = token;
    }
    for (const row of rows) {
      const prev = catalog.get(row.stationId);
      if (!prev) {
        catalog.set(row.stationId, {
          ...row,
          firstSeenToken: token,
          lastSeenToken: token,
        });
      } else {
        prev.lastSeenToken = token;
        if (row.reportTimeUtc) prev.reportTimeUtc = row.reportTimeUtc;
        if (row.amountIn !== null) prev.amountIn = row.amountIn;
      }
    }
    await sleep(40);
  }
  return { catalog, snapshots, latestText, latestUrl, latestToken };
}

function qualifiesAsSummit(place, meta, distanceMi) {
  if (place.elevationFt === null || meta.elevationFt === null) return false;
  return distanceMi <= SUMMIT_MAX_MI && Math.abs(place.elevationFt - meta.elevationFt) <= SUMMIT_MAX_ELEV_FT;
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

function finishBindings(place, picked) {
  const kindOrder = { summit: 0, 'nearby-higher': 1, valley: 2, base: 3 };
  return picked
    .map((b) => {
      const nws =
        stationBindings.stations?.[b.stationId] ??
        (b.stationId === 'MWN' ? stationBindings.stations?.KMWN : undefined);
      if (!nws) return b;
      const stationElevationFt = nws.elevationFt ?? b.stationElevationFt;
      const elevationDiffFt =
        place.elevationFt !== null && stationElevationFt !== null ? stationElevationFt - place.elevationFt : b.elevationDiffFt;
      return {
        ...b,
        stationName: nws.name ?? b.stationName,
        lat: nws.lat,
        lon: nws.lon,
        stationElevationFt,
        elevationSource: nws.elevationSource,
        network: nws.network,
        epqsElevationFt: nws.epqsElevationFt ?? b.epqsElevationFt,
        elevationDiffFt,
      };
    })
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.distanceMi - b.distanceMi)
    .slice(0, MAX_BINDINGS);
}

function bindPlace(place, stationCatalog) {
  const stations = [...stationCatalog.values()];
  const used = new Set();
  const picked = [];

  function addBinding(meta, kind, extra = '') {
    if (used.has(meta.stationId)) return;
    const distanceMi = Math.round(haversineMi(place.lat, place.lon, meta.lat, meta.lon) * 10) / 10;
    if (distanceMi > MAX_BIND_MI) return;
    const elevationDiffFt =
      place.elevationFt !== null && meta.elevationFt !== null ? meta.elevationFt - place.elevationFt : null;

    if (kind === 'summit') {
      const pin = SUMMIT_PIN_BY_PLACE[place.id];
      if (pin && meta.stationId !== pin && !qualifiesAsSummit(place, meta, distanceMi)) return;
      if (!pin && !qualifiesAsSummit(place, meta, distanceMi)) return;
    }
    if (kind === 'valley' || kind === 'base') {
      if (!qualifiesValleyOrBase(place, meta)) return;
    }

    const peak = SUMMIT_STATION_PEAK[meta.stationId];
    let finalKind = kind;
    if (kind === 'summit' && peak && peak.placeId !== place.id) {
      finalKind = 'nearby-higher';
      extra = extra || `Nearby higher: ${peak.peakLabel}.`;
    }
    if (finalKind === 'summit' && meta.stationId === 'MWN') {
      finalKind = 'nearby-higher';
      extra = 'NOHRSC MWN ID is not the KMWN ASOS summit pin; treat as nearby Mount Washington snow.';
    }

    const distant = distanceMi > DISTANT_MI;
    used.add(meta.stationId);
    picked.push({
      stationId: meta.stationId,
      source: meta.source,
      network: meta.network,
      stationName: meta.name,
      lat: meta.lat,
      lon: meta.lon,
      stationElevationFt: meta.elevationFt,
      elevationSource: meta.elevationSource,
      nohrscElevationFt: meta.nohrscElevationFt,
      epqsElevationFt: meta.epqsElevationFt,
      distanceMi,
      elevationDiffFt,
      kind: finalKind,
      element: meta.element,
      bindReason: `${meta.network} · ${distant ? `${distanceMi} mi (distant).` : `${distanceMi} mi.`} ${extra}`.trim(),
    });
  }

  const pin = SUMMIT_PIN_BY_PLACE[place.id];
  if (pin && !place.isBase) {
    const meta = stationCatalog.get(pin);
    if (meta) addBinding(meta, 'summit', 'Pinned summit snow station.');
  }

  const obsPlace = stationBindings.places?.[place.id];
  if (obsPlace?.observations) {
    for (const obs of obsPlace.observations) {
      if (obs.hideFromObservationsSection) continue;
      const meta = stationCatalog.get(obs.stationId);
      if (!meta) continue;
      const kind =
        obs.kind === 'summit' ? 'summit' : obs.kind === 'nearby-higher' ? 'nearby-higher' : place.isBase ? 'base' : 'valley';
      addBinding(meta, kind, `Aligned with M10 observation binding (${obs.stationId}).`);
    }
  }

  for (const [sid, peak] of Object.entries(SUMMIT_STATION_PEAK)) {
    if (peak.placeId === place.id || sid === pin) continue;
    if (sid === 'MWN' && (used.has('KMWN') || stationCatalog.has('KMWN'))) continue;
    const meta = stationCatalog.get(sid);
    if (!meta) continue;
    const distanceMi = haversineMi(place.lat, place.lon, meta.lat, meta.lon);
    if (distanceMi > MAX_NEARBY_HIGHER_MI) continue;
    if (meta.elevationFt != null && place.elevationFt != null && meta.elevationFt <= place.elevationFt + 200) continue;
    addBinding(meta, 'nearby-higher', `Nearby higher: ${peak.peakLabel}.`);
  }

  const ranked = stations
    .filter((s) => !used.has(s.stationId))
    .map((s) => ({
      meta: s,
      distanceMi: haversineMi(place.lat, place.lon, s.lat, s.lon),
    }))
    .filter((r) => r.distanceMi <= MAX_BIND_MI)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  for (const { meta, distanceMi } of ranked) {
    if (picked.length >= MAX_BINDINGS) break;
    if (SUMMIT_STATION_PEAK[meta.stationId]) continue;
    const kind = place.isBase ? 'base' : 'valley';
    const before = picked.length;
    addBinding(meta, kind, 'Auto: nearest qualifying NOHRSC/CoCoRaHS snowdepth in catalog.');
    if (picked.length === before && distanceMi <= MAX_BIND_MI) {
      /* skip */
    }
  }

  return finishBindings(place, picked);
}

console.log('Loading multi-day NOHRSC catalog…');
const epqsCache = loadEpqsCache();
const places = listPlaces();
const { catalog: rawCatalog, snapshots, latestText, latestUrl, latestToken } = await buildMultiDayCatalog();
console.log(`Catalog raw ${rawCatalog.size} stations from ${snapshots.length} files`);

const draftCatalog = new Map();
for (const [id, row] of rawCatalog) {
  draftCatalog.set(id, {
    ...row,
    elevationFt: row.nohrscElevationFt,
    elevationSource: 'NOHRSC table (pre-EPQS)',
    nohrscElevationFt: row.nohrscElevationFt,
    epqsElevationFt: null,
    network: classifyNetwork(id, row.name),
  });
}

const idsForEpqs = new Set(Object.values(SUMMIT_PIN_BY_PLACE));
for (const place of places) {
  for (const m of bindPlace(place, draftCatalog)) idsForEpqs.add(m.stationId);
}

const enrichedCatalog = new Map(draftCatalog);
console.log(`EPQS for ${idsForEpqs.size} bound/pinned stations…`);
const epqsIds = [...idsForEpqs];
let done = 0;
await Promise.all(
  epqsIds.map(async (id) => {
    const row = enrichedCatalog.get(id);
    if (!row) return;
    const epqs = await getEpqsFt(row.lat, row.lon, epqsCache);
    const elev = resolveElevation(row.nohrscElevationFt, epqs);
    enrichedCatalog.set(id, { ...row, ...elev, network: classifyNetwork(id, row.name) });
    done += 1;
    if (done % 20 === 0) saveEpqsCache(epqsCache);
  }),
);
saveEpqsCache(epqsCache);

fs.writeFileSync(
  catalogPath,
  `${JSON.stringify(
    {
      version: 2,
      builtAt: new Date().toISOString(),
      lookbackHours: LOOKBACK_HOURS,
      reportStaleDays: REPORT_STALE_DAYS,
      snapshots,
      stationCount: enrichedCatalog.size,
      stations: Object.fromEntries(enrichedCatalog),
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(
  snapshotPath,
  `${JSON.stringify(
    {
      version: 2,
      fetchedAt: new Date().toISOString(),
      reportToken: latestToken,
      sourceUrl: latestUrl,
      stations: parseNohrscRows(latestText),
    },
    null,
    2,
  )}\n`,
);

const bindings = {};
const flatAudit = [];
for (const place of places) {
  const measured = bindPlace(place, enrichedCatalog);
  if (measured.length) bindings[place.id] = { measured };
  for (const m of measured) {
    flatAudit.push({
      placeId: place.id,
      stationId: m.stationId,
      network: m.network,
      kind: m.kind,
      distanceMi: m.distanceMi,
      elevationDiffFt: m.elevationDiffFt,
    });
  }
}

fs.writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      version: 2,
      catalogBuiltAt: new Date().toISOString(),
      nohrscLatestToken: latestToken,
      ruleSummary: RULE_SUMMARY,
      places: bindings,
      flatAudit,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Catalog ${enrichedCatalog.size} stations from ${snapshots.length} snapshots; bindings for ${Object.keys(bindings).length} places`,
);