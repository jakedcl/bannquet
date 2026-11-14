#!/usr/bin/env node
/** Explicit avalanche center bindings — no geometry guessing. */
import fs from 'node:fs';
import path from 'node:path';
import sourceBindings from '../../config/mountain-weather/source-bindings.json' with { type: 'json' };
import placesCatalog from '../../config/mountain-weather/places.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const outPath = path.join(ROOT, 'config/mountain-weather/avalanche-bindings.json');
const avgPointsPath = path.join(ROOT, 'config/mountain-weather/avalanche-avg-points.json');

const MWAC_PLACE_IDS = new Set(['mount-washington', 'mount-adams', 'pinkham-notch']);

const NYSAC_SECTIONS = new Set(['adirondack-high-peaks', 'northern-adirondacks']);

function nysacPlaceIds() {
  const ids = [];
  for (const state of placesCatalog.states) {
    if (state.code !== 'ny') continue;
    for (const section of state.sections) {
      if (!NYSAC_SECTIONS.has(section.id)) continue;
      for (const place of section.places) ids.push(place.id);
    }
  }
  return ids;
}

function slugify(office, pointMatch) {
  const base = `${office}-${pointMatch}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base;
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

const places = {};
for (const id of MWAC_PLACE_IDS) {
  places[id] = { centers: ['MWAC'], bindReason: 'Presidential Range avalanche forecast zone (MWAC via avalanche.org map-layer).' };
}
for (const id of nysacPlaceIds()) {
  places[id] = {
    centers: ['NYSAC'],
    bindReason: 'Adirondack Park avalanche guidance zone (NY DEC NYSAC via avalanche.org map-layer).',
  };
}

const avgPoints = collectAvgPoints();

fs.writeFileSync(
  avgPointsPath,
  `${JSON.stringify({ version: 1, points: avgPoints }, null, 2)}\n`,
);
fs.writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      version: 1,
      ruleSummary:
        'MWAC for mount-washington, mount-adams, pinkham-notch. NYSAC for all places in Adirondack High Peaks and Northern Adirondacks sections. AVG subpages derived from explicit source-bindings avg pointMatch values (16 points).',
      centers: {
        MWAC: {
          id: 'MWAC',
          name: 'Mount Washington Avalanche Center',
          mapLayerUrl: 'https://api.avalanche.org/v2/public/products/map-layer/MWAC',
          org: 'MWAC (USFS)',
        },
        NYSAC: {
          id: 'NYSAC',
          name: 'NY DEC Adirondack avalanche guidance',
          mapLayerUrl: 'https://api.avalanche.org/v2/public/products/map-layer/NYSAC',
          org: 'NY DEC',
        },
      },
      places,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${outPath} (${Object.keys(places).length} places) and ${avgPointsPath} (${avgPoints.length} AVG points)`);