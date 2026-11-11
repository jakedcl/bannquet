import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PEAK_FINDER_SW_SCOPE,
  canCacheNavigationResponse,
  classifyServiceWorkerFetch,
  isPeakFinderPath,
  pathMatchesScope,
} from './sw-routing';

test('/peak-finder matches peak finder paths with and without query', () => {
  assert.equal(isPeakFinderPath('/peak-finder'), true);
  assert.equal(isPeakFinderPath('/peak-finder/'), true);
  assert.equal(isPeakFinderPath('/peak-finder/peaks/index.json'), true);
  assert.equal(isPeakFinderPath('/peaks'), false);
});

test('scope /peak-finder/ does not control the document URL /peak-finder', () => {
  const narrowScope = '/peak-finder/';
  assert.equal(pathMatchesScope('/peak-finder', narrowScope), false);
  assert.equal(pathMatchesScope('/peak-finder/', narrowScope), true);
  assert.equal(pathMatchesScope('/peak-finder', PEAK_FINDER_SW_SCOPE), true);
});

test('classifyServiceWorkerFetch handles navigate and assets', () => {
  assert.equal(classifyServiceWorkerFetch('/peak-finder', 'navigate'), 'peak-finder-navigate');
  assert.equal(classifyServiceWorkerFetch('/trips', 'navigate'), 'ignore');
  assert.equal(classifyServiceWorkerFetch('/_next/static/chunks/1.js', ''), 'next-static');
  assert.equal(classifyServiceWorkerFetch('/peak-finder/declination.v1.json', ''), 'peak-finder-asset');
});

test('canCacheNavigationResponse rejects redirects and opaque types', () => {
  assert.equal(canCacheNavigationResponse(200, 'basic', false), true);
  assert.equal(canCacheNavigationResponse(302, 'basic', true), false);
  assert.equal(canCacheNavigationResponse(200, 'opaqueredirect', false), false);
  assert.equal(canCacheNavigationResponse(401, 'basic', false), false);
});
