import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanRouteTitle, routeTitle } from './route-title';

test('a route with no title is just called Route', () => {
  assert.equal(routeTitle(null), 'Route');
  assert.equal(routeTitle(''), 'Route');
  assert.equal(routeTitle('   '), 'Route');
  assert.equal(routeTitle('Untitled'), 'Route');
  assert.equal(routeTitle('No title'), 'Route');
  assert.equal(routeTitle('Heart Lake'), 'Heart Lake');
});

test('a blank title is stored as null', () => {
  assert.equal(cleanRouteTitle('  '), null);
  assert.equal(cleanRouteTitle('Untitled'), null);
  assert.equal(cleanRouteTitle('no title'), null);
  assert.equal(cleanRouteTitle('  Avalanche Pass  '), 'Avalanche Pass');
  assert.equal(cleanRouteTitle('x'.repeat(200))?.length, 120);
});
