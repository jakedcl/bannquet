#!/usr/bin/env node
/**
 * Full-page screenshots of key routes at phone and desktop width, for
 * before/after comparison during the UI revamp.
 *
 * Usage (local, against `npm run start` or `npm run dev`):
 *   PORT=3000 node scripts/ui-screenshots.mjs [label]
 * Preview:
 *   SHOTS_BASE_URL=https://... VERCEL_AUTOMATION_BYPASS_SECRET=... node scripts/ui-screenshots.mjs preview
 *
 * Writes PNGs to .ui-shots/<label>/ (gitignored). Label defaults to the
 * current git branch. Pages that need sign-in are skipped unless
 * SHOTS_COOKIE holds a session cookie header for the preview test account.
 *
 * Cloud agents: Node's fetch ignores HTTPS_PROXY, so start the server with
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx next start -p 3000
 * or every weather source renders as an error state.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// Playwright is preinstalled globally in cloud agents (NODE_PATH); require() honors that, import does not.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = process.env.SHOTS_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '';
const COOKIE = process.env.SHOTS_COOKIE ?? '';

const label = (process.argv[2] ?? execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim())
  .replace(/[^a-z0-9._-]+/gi, '-');
const outDir = path.join(ROOT, '.ui-shots', label);

/** Public pages that render without a database or sign-in. */
const PUBLIC_ROUTES = [
  '/',
  '/map',
  '/peak-finder',
  '/mountain-weather',
  '/mountain-weather/new-york',
  '/mountain-weather/new-york/adirondack-high-peaks',
  '/mountain-weather/new-york/adirondack-high-peaks/mount-marcy',
  '/mountain-weather/conditions',
  '/mountain-weather/snow',
  '/mountain-weather/snow/avalanche',
  '/mountain-weather/maps',
  '/fishing',
  '/fishing/freshwater',
  '/fishing/saltwater',
  '/fishing/stocking',
  '/fishing/guides',
  '/peaks',
  '/peaks/adk46_marcy',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
];

/** Pages that need a signed-in member (skipped without SHOTS_COOKIE). */
const MEMBER_ROUTES = ['/community', '/posts', '/photos', '/chat', '/members', '/upload', '/settings', '/account'];

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

function fileName(route, viewport) {
  const slug = route === '/' ? 'home' : route.slice(1).replace(/[/?=&]+/g, '_');
  return `${slug}.${viewport}.png`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const routes = COOKIE ? [...PUBLIC_ROUTES, ...MEMBER_ROUTES] : PUBLIC_ROUTES;
  const headers = {};
  if (BYPASS_SECRET) headers['x-vercel-protection-bypass'] = BYPASS_SECRET;
  if (COOKIE) headers.cookie = COOKIE;

  const browser = await chromium.launch();
  const failures = [];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      extraHTTPHeaders: headers,
    });
    const page = await context.newPage();
    for (const route of routes) {
      const file = path.join(outDir, fileName(route, viewport.name));
      try {
        const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
        const status = response?.status() ?? 0;
        await page.screenshot({ path: file, fullPage: true });
        console.log(`${status} ${viewport.name} ${route}`);
        if (status >= 400) failures.push(`${status} ${viewport.name} ${route}`);
      } catch (error) {
        failures.push(`ERR ${viewport.name} ${route}: ${error.message.split('\n')[0]}`);
        console.log(`ERR ${viewport.name} ${route}`);
      }
    }
    await context.close();
  }
  await browser.close();
  console.log(`\nWrote ${outDir}`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):\n${failures.join('\n')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
