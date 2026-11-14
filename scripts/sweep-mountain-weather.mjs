#!/usr/bin/env node
/**
 * Fetches mountain-weather routes from a running Next server and greps HTML for leak patterns.
 * Usage: PORT=3099 node scripts/sweep-mountain-weather.mjs
 * Start first: npm run build && PORT=3099 npm run start
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = process.env.SWEEP_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3099'}`;
const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY ?? 4);

const STATE_SLUGS = {
  ny: 'new-york',
  vt: 'vermont',
  nh: 'new-hampshire',
  me: 'maine',
};

const PATTERNS = [
  { name: 'Unexpected token', re: /Unexpected token/i },
  { name: 'SyntaxError', re: /\bSyntaxError\b/ },
  { name: 'TypeError', re: /\bTypeError\b/ },
  { name: 'undefined leak', re: />(undefined|UNDEFINED)</ },
  { name: 'NaN leak', re: />(NaN|NAN)</ },
  { name: '[object Object]', re: /\[object Object\]/ },
  { name: 'Invalid Date', re: />Invalid Date</ },
  { name: 'Error: prefix', re: />\s*Error:/ },
];

function loadPlaces() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));
  const routes = [];
  for (const state of raw.states) {
    const stateSlug = STATE_SLUGS[state.code];
    routes.push(`/mountain-weather/${stateSlug}`);
    for (const section of state.sections) {
      routes.push(`/mountain-weather/${stateSlug}/${section.id}`);
      for (const place of section.places) {
        routes.push(`/mountain-weather/${stateSlug}/${section.id}/${place.id}`);
      }
    }
  }
  return routes;
}

function loadAvalancheSlugs() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config/mountain-weather/avalanche-avg-points.json'), 'utf8'),
  );
  return (raw.points ?? []).map((p) => `/mountain-weather/snow/avalanche/${p.slug}`);
}

function collectRoutes() {
  const set = new Set([
    '/',
    '/mountain-weather',
    '/mountain-weather/conditions',
    '/mountain-weather/maps',
    '/mountain-weather/snow',
    '/mountain-weather/snow/avalanche',
    ...loadPlaces(),
    ...loadAvalancheSlugs(),
  ]);
  return [...set];
}

async function fetchRoute(route) {
  const url = `${BASE}${route}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' }, redirect: 'follow' });
    const text = await res.text();
    return { route, status: res.status, text };
  } catch (err) {
    return { route, status: 0, text: '', error: err instanceof Error ? err.message : String(err) };
  }
}

function scanText(text) {
  const hits = [];
  for (const { name, re } of PATTERNS) {
    const m = text.match(re);
    if (m) hits.push({ pattern: name, sample: m[0] });
  }
  return hits;
}

async function main() {
  const routes = collectRoutes();
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < routes.length) {
      const i = idx++;
      const route = routes[i];
      const row = await fetchRoute(route);
      const patternHits = row.text ? scanText(row.text) : [];
      results.push({ ...row, patternHits });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  results.sort((a, b) => a.route.localeCompare(b.route));
  const badStatus = results.filter((r) => r.status !== 200);
  const patternBad = results.filter((r) => r.patternHits.length > 0);

  console.log(JSON.stringify({ base: BASE, scanned: results.length, badStatus, patternBad }, null, 2));

  if (badStatus.length || patternBad.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});