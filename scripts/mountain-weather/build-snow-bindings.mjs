#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import placeCoords from '../../config/mountain-weather/place-coordinates.json' with { type: 'json' };
import placesCatalog from '../../config/mountain-weather/places.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotPath = path.join(ROOT, 'config/mountain-weather/snow-nohrsc-snapshot.json');
const outPath = path.join(ROOT, 'config/mountain-weather/snow-measured-bindings.json');

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';
const MAX_BIND_MI = 40;
const DISTANT_MI = 25;
const SUMMIT_MAX_MI = 1.05;
const SUMMIT_MAX_ELEV_FT = 500;
const MAX_BINDINGS = 4;

const SUMMIT_STATION_IDS = new Set(['KMWN', 'MWN', 'A4090', 'A3672', 'MMNV1']);

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

function parseNohrsc(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('!') || line.startsWith('Station_Id')) continue;
    const p = line.split('|');
    if (p.length < 9) continue;
    const elevM = p[4]?.match(/([\d.]+)\s*feet/i);
    rows.push({
      stationId: p[0].trim(),
      name: p[1].trim(),
      lat: Number(p[2]),
      lon: Number(p[3]),
      elevationFt: elevM ? Math.round(Number(elevM[1])) : null,
      element: /snowdepth/i.test(p[5]) ? 'snowdepth' : 'unknown',
      reportTimeUtc: p[6]?.trim() ?? null,
      amountIn: Number(p[7]),
      source: p[0].includes('-') ? 'COCORAHS' : 'NOHRSC',
    });
  }
  return rows;
}

async function fetchNohrscSnapshot() {
  const indexRes = await fetch('https://www.nohrsc.noaa.gov/nsa/index.html?region=Northeast', {
    headers: { 'User-Agent': USER_AGENT },
  });
  const indexHtml = await indexRes.text();
  const tokens = [...indexHtml.matchAll(/nsm_depth_(\d{10})_Northeast\.jpg/g)].map((m) => m[1]);
  const reportsRes = await fetch(
    'https://www.nohrsc.noaa.gov/nsa/reports.html?region=Northeast&var=snowdepth',
    { headers: { 'User-Agent': USER_AGENT } },
  );
  const reportsHtml = await reportsRes.text();
  tokens.push(...[...reportsHtml.matchAll(/snowdepth_(\d{10})/g)].map((m) => m[1]));
  if (!tokens.length) throw new Error('NOHRSC run token not found on index');
  let text = '';
  let token = tokens[0];
  let sourceUrl = '';
  for (const candidate of [...new Set(tokens)]) {
    const yyyymm = candidate.slice(0, 6);
    sourceUrl = `https://www.nohrsc.noaa.gov/nsa/discussions_text/Northeast/snowdepth/${yyyymm}/snowdepth_${candidate}_e.txt`;
    const textRes = await fetch(sourceUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (textRes.ok) {
      token = candidate;
      text = await textRes.text();
      break;
    }
  }
  if (!text) throw new Error(`NOHRSC text not found for tokens: ${tokens.join(', ')}`);
  const fetchedAt = new Date().toISOString();
  const stations = parseNohrsc(text);
  const snapshot = { version: 1, fetchedAt, reportToken: token, sourceUrl, stations };
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

function classifyKind(place, station, distanceMi, elevationDiffFt) {
  if (place.isBase) return 'base';
  if (SUMMIT_STATION_IDS.has(station.stationId)) return 'summit';
  if (
    distanceMi <= SUMMIT_MAX_MI &&
    elevationDiffFt !== null &&
    Math.abs(elevationDiffFt) <= SUMMIT_MAX_ELEV_FT &&
    place.elevationFt !== null
  ) {
    return 'summit';
  }
  if (place.elevationFt !== null && station.elevationFt !== null && station.elevationFt < place.elevationFt - 400) {
    return 'valley';
  }
  if (place.elevationFt !== null && station.elevationFt !== null && station.elevationFt >= place.elevationFt - 200) {
    return 'summit';
  }
  return 'valley';
}

function bindPlace(place, stations) {
  const ranked = stations
    .map((s) => {
      const distanceMi = Math.round(haversineMi(place.lat, place.lon, s.lat, s.lon) * 10) / 10;
      const elevationDiffFt =
        place.elevationFt !== null && s.elevationFt !== null ? s.elevationFt - place.elevationFt : null;
      const kind = classifyKind(place, s, distanceMi, elevationDiffFt);
      return { ...s, distanceMi, elevationDiffFt, kind };
    })
    .filter((s) => s.distanceMi <= MAX_BIND_MI)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  const picked = [];
  const seen = new Set();
  for (const row of ranked) {
    if (picked.length >= MAX_BINDINGS) break;
    if (seen.has(row.stationId)) continue;
    seen.add(row.stationId);
    const distant = row.distanceMi > DISTANT_MI;
    picked.push({
      stationId: row.stationId,
      source: row.source,
      stationName: row.name,
      lat: row.lat,
      lon: row.lon,
      stationElevationFt: row.elevationFt,
      distanceMi: row.distanceMi,
      elevationDiffFt: row.elevationDiffFt,
      kind: row.kind,
      element: row.element,
      bindReason: distant
        ? `NOHRSC ${row.element} report · ${row.distanceMi} mi (distant; labeled in UI).`
        : `NOHRSC ${row.element} report · ${row.distanceMi} mi.`,
    });
  }
  return picked;
}

const snapshot = fs.existsSync(snapshotPath)
  ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  : await fetchNohrscSnapshot();

if (!snapshot.stations?.length) {
  await fetchNohrscSnapshot();
  Object.assign(snapshot, JSON.parse(fs.readFileSync(snapshotPath, 'utf8')));
}

const places = {};
const audit = [];
for (const place of listPlaces()) {
  const measured = bindPlace(place, snapshot.stations);
  if (measured.length) places[place.id] = { measured };
  audit.push({ placeId: place.id, count: measured.length });
}

fs.writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      version: 1,
      nohrscSnapshotAt: snapshot.fetchedAt,
      ruleSummary: `Nearest measured snow from NOHRSC/COCORAHS station snow-depth table (${snapshot.fetchedAt.slice(0, 10)}). Summit vs valley by distance and elevation; >${DISTANT_MI} mi labeled distant; never valley as summit when >400 ft below catalog summit.`,
      places,
      audit,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${outPath} for ${Object.keys(places).length} places (snapshot ${snapshot.reportToken})`);