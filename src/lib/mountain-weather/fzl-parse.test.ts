import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseFzlProduct, parseRadatPayload } from '@/lib/mountain-weather/parse/fzl';
import { SOURCE_REGISTRY } from '@/lib/mountain-weather/registry';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('RADAT single crossing decodes RH and feet', () => {
  const radat = parseRadatPayload('63017');
  assert.equal(radat.kind, 'single');
  assert.equal(radat.rhPercent, 63);
  assert.deepEqual(radat.levelsFt, [1700]);
});

test('RADAT multi with L marks RH at lowest crossing', () => {
  const radat = parseRadatPayload('91L028039061');
  assert.equal(radat.rhPercent, 91);
  assert.equal(radat.rhLevel, 'low');
  assert.deepEqual(radat.levelsFt, [2800, 3900, 6100]);
});

test('FZL bulletin fixtures parse observation fields', () => {
  const multi = parseFzlProduct(readFileSync(path.join(FIX, 'fzl-aly-multi.txt'), 'utf8'), 'ALY', 'id', null);
  assert.equal(multi.observation?.station, 'ALY');
  assert.equal(multi.observation?.cycleHhmm, '1200');
  assert.deepEqual(multi.observation?.radat?.levelsFt, [2800, 3900, 6100]);

  const single = parseFzlProduct(readFileSync(path.join(FIX, 'fzl-gyx-single.txt'), 'utf8'), 'GYX', 'id', null);
  assert.equal(single.observation?.station, 'GYX');
  assert.equal(single.observation?.radat?.kind, 'single');

  const surface = parseFzlProduct(readFileSync(path.join(FIX, 'fzl-aly-surface.txt'), 'utf8'), 'ALY', 'id', null);
  assert.equal(surface.observation?.radat?.kind, 'surface');
});

test('FZL registry entries exist for ALY and GYX', () => {
  assert.ok(SOURCE_REGISTRY['nws-aly-fzl']);
  assert.ok(SOURCE_REGISTRY['nws-gyx-fzl']);
});