#!/usr/bin/env node
/**
 * Full-site HTML sweep (mountain weather + main app routes).
 * Usage: PORT=3099 node scripts/sweep-site-polish.mjs
 * Preview: SWEEP_BASE_URL=https://... VERCEL_AUTOMATION_BYPASS_SECRET=... node scripts/sweep-site-polish.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = process.env.SWEEP_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3099'}`;
const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY ?? 4);
const BYPASS_SECRET =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? process.env.SWEEP_VERCEL_BYPASS_SECRET ?? '';
const BYPASS_HEADER = process.env.SWEEP_VERCEL_BYPASS_HEADER ?? 'x-vercel-protection-bypass';
const SHARE_TOKEN = process.env.SWEEP_VERCEL_SHARE ?? '';

function sweepHeaders() {
  const headers = { Accept: 'text/html' };
  if (BYPASS_SECRET) headers[BYPASS_HEADER] = BYPASS_SECRET;
  return headers;
}

function sweepUrl(route) {
  const base = `${BASE}${route}`;
  if (!SHARE_TOKEN) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`;
}

const STATE_SLUGS = { ny: 'new-york', vt: 'vermont', nh: 'new-hampshire', me: 'maine' };

const PATTERNS = [
  { name: 'Unexpected token', re: /Unexpected token/i },
  { name: 'SyntaxError', re: /\bSyntaxError\b/ },
  { name: 'TypeError', re: /\bTypeError\b/ },
  { name: 'undefined leak', re: />(undefined|UNDEFINED)</ },
  { name: 'null leak', re: />\s*null\s*</i },
  { name: 'NaN leak', re: />(NaN|NAN)</ },
  { name: '[object Object]', re: /\[object Object\]/ },
  { name: 'Invalid Date', re: />Invalid Date</ },
  { name: 'Error: prefix', re: />\s*Error:/ },
  { name: 'raw ISO UTC', re: />\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z\s*</ },
];

function loadMountainWeatherRoutes() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/mountain-weather/places.json'), 'utf8'));
  const routes = [
    '/mountain-weather',
    '/mountain-weather/conditions',
    '/mountain-weather/maps',
    '/mountain-weather/snow',
    '/mountain-weather/snow/avalanche',
  ];
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
  const avg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config/mountain-weather/avalanche-avg-points.json'), 'utf8'),
  );
  for (const p of avg.points ?? []) {
    routes.push(`/mountain-weather/snow/avalanche/${p.slug}`);
  }
  return routes;
}

function loadPeakSample() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/challenges/cat3500.json'), 'utf8'));
    const first = raw.peaks?.[0];
    return first?.slug ? [`/peaks/${first.slug}`] : [];
  } catch {
    return [];
  }
}

function collectRoutes() {
  const set = new Set([
    '/',
    '/map',
    '/peak-finder',
    '/peaks',
    ...loadPeakSample(),
    '/photos',
    '/posts',
    '/community',
    '/fishing',
    '/fishing/freshwater',
    '/fishing/saltwater',
    '/fishing/stocking',
    '/fishing/guides',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/__bannquet-sweep-404__',
    ...loadMountainWeatherRoutes(),
  ]);
  return [...set].sort();
}

async function fetchRoute(route) {
  const url = sweepUrl(route);
  try {
    const res = await fetch(url, { headers: sweepHeaders(), redirect: 'follow' });
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
  const badStatus = results.filter((r) => {
    if (r.route === '/__bannquet-sweep-404__') return r.status !== 404;
    return r.status !== 200;
  });
  const patternBad = results.filter((r) => r.patternHits.length > 0);

  console.log(
    JSON.stringify(
      {
        base: BASE,
        scanned: results.length,
        badStatus,
        patternBad: patternBad.map((r) => ({ route: r.route, hits: r.patternHits })),
      },
      null,
      2,
    ),
  );

  if (badStatus.length || patternBad.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});