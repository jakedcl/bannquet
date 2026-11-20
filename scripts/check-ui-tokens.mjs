#!/usr/bin/env node
/**
 * UI revamp guard: finds styling that bypasses the design tokens and
 * shared components in page and component code.
 *
 *   node scripts/check-ui-tokens.mjs          report counts (never fails)
 *   node scripts/check-ui-tokens.mjs --list   also list every hit
 *   node scripts/check-ui-tokens.mjs --strict fail on any hit (final stage)
 *
 * Canvas and map drawing code that needs literal colors goes in ALLOW.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['src/app', 'src/components'];
const strict = process.argv.includes('--strict');
const list = process.argv.includes('--list') || strict;

/** Files allowed to use literal colors (canvas drawing, map styles). */
const ALLOW = [
  // MapLibre paint properties need literal colors.
  'src/components/mountain-weather/MountainWeatherPlacesMap.tsx',
  'src/components/fishing/FishingMap.tsx',
  'src/components/fishing/ShoreMap.tsx',
];

const RULES = [
  { id: 'hex', why: 'raw hex color; use a token', re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z-])/g },
  { id: 'retro', why: 'legacy retro-* class; use a shared component', re: /\bretro-[a-z-]+/g },
  { id: 'arbitrary-color', why: 'arbitrary color class; use a token', re: /\b(?:bg|text|border|from|to|via|fill|stroke|ring|outline)-\[(?:#|rgb|hsl)[^\]]*\]/g },
  { id: 'gray-scale', why: 'raw Tailwind gray; use a text/surface token', re: /\b(?:bg|text|border)-gray-\d{2,3}\b/g },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const totals = Object.fromEntries(RULES.map((rule) => [rule.id, 0]));
const hits = [];
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file);
    if (ALLOW.includes(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const rule of RULES) {
        const found = line.match(rule.re);
        if (!found) continue;
        totals[rule.id] += found.length;
        hits.push(`${rel}:${index + 1}  ${rule.id}  ${found.join(' ')}`);
      }
    });
  }
}

if (list) for (const hit of hits) console.log(hit);
console.log('\nUI token check');
for (const rule of RULES) console.log(`  ${rule.id.padEnd(16)} ${String(totals[rule.id]).padStart(5)}  ${rule.why}`);
const total = hits.length;
if (strict && total > 0) {
  console.error(`\n${total} line(s) bypass the design tokens.`);
  process.exit(1);
}
