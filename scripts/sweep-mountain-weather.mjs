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
const BYPASS_SECRET =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ??
  process.env.SWEEP_VERCEL_BYPASS_SECRET ??
  '';
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

const UI_FAILURE_PATTERNS = [
  { name: 'did not load', re: /did not load/gi },
  { name: 'source error', re: /source error/gi },
  { name: 'unavailable', re: /\(unavailable\)|\b(?:AVG|REC|HWO) unavailable\b/gi },
  { name: 'could not be parsed', re: /could not be parsed/gi },
  { name: 'data-mwx-source-error', re: /data-mwx-source-error=/gi },
  { name: 'not in this issuance', re: /not in this issuance/gi },
];

const SWEEP_FAILURE_PATTERNS = new Set([
  'did not load',
  'source error',
  'unavailable',
  'could not be parsed',
  'data-mwx-source-error',
]);

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
  const url = sweepUrl(route);
  try {
    const res = await fetch(url, { headers: sweepHeaders(), redirect: 'follow' });
    const text = await res.text();
    return { route, status: res.status, text };
  } catch (err) {
    return { route, status: 0, text: '', error: err instanceof Error ? err.message : String(err) };
  }
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function nearestSectionTitle(html, index) {
  const before = html.slice(Math.max(0, index - 4000), index);
  const matches = [...before.matchAll(/title="([^"]+)"/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

function scanText(text) {
  const hits = [];
  for (const { name, re } of PATTERNS) {
    const m = text.match(re);
    if (m) hits.push({ pattern: name, sample: m[0] });
  }
  return hits;
}

function scanAttributedSourceErrors(text, route) {
  const hits = [];
  const re = /data-mwx-source-error="([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) {
    hits.push({
      route,
      pattern: 'source error',
      section: 'Weather observation',
      context: m[1],
      plainSample: m[1],
      serverError: m[1],
    });
  }
  return hits;
}

function scanUiFailures(text, route) {
  const plain = stripTags(text);
  const hits = [];
  for (const { name, re } of UI_FAILURE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const section = nearestSectionTitle(text, m.index);
      const contextStart = Math.max(0, m.index - 120);
      const contextEnd = Math.min(text.length, m.index + 160);
      const context = stripTags(text.slice(contextStart, contextEnd)).slice(0, 200);
      hits.push({
        route,
        pattern: name,
        section: section ?? 'unknown section',
        context,
        plainSample: plain.includes(m[0]) ? m[0] : name,
      });
    }
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
      const uiFailureHits = row.text ? scanUiFailures(row.text, route) : [];
      const attributedErrors = row.text ? scanAttributedSourceErrors(row.text, route) : [];
      results.push({ ...row, patternHits, uiFailureHits, attributedErrors });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  results.sort((a, b) => a.route.localeCompare(b.route));
  const badStatus = results.filter((r) => r.status !== 200);
  const patternBad = results.filter((r) => r.patternHits.length > 0);
  const uiFailures = results.flatMap((r) => r.uiFailureHits ?? []);
  const uiFailureGroups = Object.groupBy?.(uiFailures, (h) => `${h.pattern}::${h.section}`) ?? {};
  if (Object.keys(uiFailureGroups).length === 0) {
    for (const hit of uiFailures) {
      const key = `${hit.pattern}::${hit.section}`;
      if (!uiFailureGroups[key]) uiFailureGroups[key] = [];
      uiFailureGroups[key].push(hit);
    }
  }

  const attributed = results.flatMap((r) => r.attributedErrors ?? []);
  const sourceErrorOnly = [
    ...uiFailures.filter((h) => SWEEP_FAILURE_PATTERNS.has(h.pattern)),
    ...attributed,
  ].filter((h) => h.pattern !== 'not in this issuance' && !/not in this issuance/i.test(h.context ?? ''));

  const upstreamChecks = [];
  const UA = 'Bannquet-Mountain-Weather-Sweep';
  async function probe(url) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/ld+json' } });
      const snippet = res.ok ? (await res.text()).slice(0, 120) : '';
      return { url, ok: res.ok, status: res.status, snippet };
    } catch (err) {
      return { url, ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (sourceErrorOnly.some((h) => /REC/i.test(h.section))) {
    for (const office of ['BTV', 'ALY', 'GYX', 'CAR']) {
      upstreamChecks.push(await probe(`https://api.weather.gov/products/types/REC/locations/${office}`));
    }
  }
  if (sourceErrorOnly.some((h) => /balloon/i.test(h.section))) {
    upstreamChecks.push(
      await probe('https://forecast.weather.gov/xml/current_obs/balloon.xml'),
    );
  }

  const pageSizes = results.map((r) => ({ route: r.route, bytes: r.text?.length ?? 0 }));
  const tinyPages = pageSizes.filter((p) => p.bytes > 0 && p.bytes < 50_000);

  let linkCheck = { checked: 0, bad: [] };
  if (process.env.SWEEP_CHECK_LINKS === '1') {
    try {
      const proc = await import('node:child_process');
      const out = proc.execFileSync(
        'npm',
        ['test', '--', 'src/lib/mountain-weather/more-sources-links.test.ts'],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
      );
      linkCheck.checked = 1;
      linkCheck.output = out.split('\n').slice(-3).join('\n');
    } catch (err) {
      linkCheck.bad.push(err instanceof Error ? err.message : String(err));
    }
  }

  console.log(
    JSON.stringify(
      {
        base: BASE,
        bypassHeader: BYPASS_SECRET ? BYPASS_HEADER : null,
        shareQuery: SHARE_TOKEN ? '_vercel_share' : null,
        linkCheck,
        scanned: results.length,
        tinyPageCount: tinyPages.length,
        tinyPagesSample: tinyPages.slice(0, 12),
        badStatus,
        patternBad: patternBad.map((r) => ({ route: r.route, hits: r.patternHits })),
        uiFailureSummary: Object.fromEntries(
          Object.entries(uiFailureGroups).map(([key, rows]) => [
            key,
            { count: rows.length, routes: [...new Set(rows.map((r) => r.route))].slice(0, 8) },
          ]),
        ),
        sourceErrors: sourceErrorOnly,
        sourceErrorCount: sourceErrorOnly.length,
        sourceErrorRoutes: [...new Set(sourceErrorOnly.map((h) => h.route))],
        upstreamEvidence: upstreamChecks,
      },
      null,
      2,
    ),
  );

  if (badStatus.length || patternBad.length || sourceErrorOnly.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});