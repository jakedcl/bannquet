#!/usr/bin/env node
/**
 * Avalanche bindings from point-in-polygon against cached avalanche.org map-layer geometry,
 * plus documented manual exceptions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceBindings from '../../config/mountain-weather/source-bindings.json' with { type: 'json' };
import placeCoords from '../../config/mountain-weather/place-coordinates.json' with { type: 'json' };
import geometryCache from '../../config/mountain-weather/avalanche-map-layer-geometry.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outPath = path.join(ROOT, 'config/mountain-weather/avalanche-bindings.json');
const avgPointsPath = path.join(ROOT, 'config/mountain-weather/avalanche-avg-points.json');

const BIND_EXCEPTIONS = {
  'pinkham-notch': {
    centers: ['MWAC'],
    bindReason:
      'Trailhead for the MWAC forecast area (just outside the zone). Explicit exception — coordinates are outside the cached MWAC map-layer polygon.',
  },
};

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lon, lat, geometry) {
  if (geometry.type === 'Polygon') return pointInRing(lon, lat, geometry.coordinates[0]);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInRing(lon, lat, poly[0]));
  }
  return false;
}

function slugify(office, pointMatch) {
  return `${office}-${pointMatch}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function collectAvgPoints() {
  const bySlug = new Map();
  for (const [placeId, binding] of Object.entries(sourceBindings.places)) {
    const avg = binding.avg;
    if (!avg) continue;
    const list = Array.isArray(avg) ? avg : [avg];
    for (const row of list) {
      const slug = slugify(row.office, row.pointMatch);
      if (!bySlug.has(slug)) {
        bySlug.set(slug, {
          slug,
          office: row.office,
          pointMatch: row.pointMatch,
          title: row.pointMatch,
          nearbyLabel: row.nearbyLabel ?? null,
          elevationNote: row.elevationNote ?? null,
          examplePlaceId: placeId,
        });
      }
    }
  }
  return [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
}

const mwGeom = geometryCache.centers.MWAC.geometry;
const nyGeom = geometryCache.centers.NYSAC.geometry;

const places = {};
const pipAudit = { MWAC: [], NYSAC: [] };

for (const [placeId, coord] of Object.entries(placeCoords.places)) {
  const lon = coord.lon;
  const lat = coord.lat;
  if (pointInGeometry(lon, lat, mwGeom)) {
    pipAudit.MWAC.push(placeId);
    places[placeId] = {
      centers: ['MWAC'],
      bindReason: `Inside MWAC map-layer polygon (point-in-polygon vs geometry cached ${geometryCache.fetchedAt.slice(0, 10)}).`,
    };
  }
  if (pointInGeometry(lon, lat, nyGeom)) {
    pipAudit.NYSAC.push(placeId);
    if (!places[placeId]) {
      places[placeId] = {
        centers: ['NYSAC'],
        bindReason: `Inside NYSAC map-layer polygon (point-in-polygon vs geometry cached ${geometryCache.fetchedAt.slice(0, 10)}).`,
      };
    } else {
      places[placeId].centers.push('NYSAC');
      places[placeId].bindReason += ` Also inside NYSAC map-layer polygon.`;
    }
  }
}

for (const [placeId, row] of Object.entries(BIND_EXCEPTIONS)) {
  places[placeId] = { centers: row.centers, bindReason: row.bindReason };
}

const ruleSummary = `MWAC and NYSAC bindings from point-in-polygon on cached avalanche.org map-layer geometry (${geometryCache.fetchedAt.slice(0, 10)}), plus explicit exceptions: pinkham-notch (MWAC trailhead outside polygon). AVG subpages from source-bindings (${collectAvgPoints().length} points).`;

const avgPoints = collectAvgPoints();

fs.writeFileSync(avgPointsPath, `${JSON.stringify({ version: 1, points: avgPoints }, null, 2)}\n`);
fs.writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      version: 2,
      geometryFetchedAt: geometryCache.fetchedAt,
      ruleSummary,
      exceptions: BIND_EXCEPTIONS,
      pipAudit,
      centers: {
        MWAC: {
          id: 'MWAC',
          name: 'Mount Washington Avalanche Center',
          mapLayerUrl: geometryCache.sources.MWAC,
          org: 'MWAC (USFS)',
        },
        NYSAC: {
          id: 'NYSAC',
          name: 'NY DEC Adirondack avalanche guidance',
          mapLayerUrl: geometryCache.sources.NYSAC,
          org: 'NY DEC',
        },
      },
      places,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Wrote ${outPath} (${Object.keys(places).length} places: MWAC pip ${pipAudit.MWAC.length}+exceptions, NYSAC pip ${pipAudit.NYSAC.length})`,
);