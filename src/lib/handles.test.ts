import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFromName, isHandle, nextHandleCandidate } from './handles';
import { isActivity } from './activities';

test('handles come from a display name', () => {
  assert.equal(handleFromName('Jake DCL'), 'jake-dcl');
  assert.equal(handleFromName('  !!!  '), 'friend');
  assert.equal(isHandle('ab'), false);
  assert.equal(isHandle('jake-dcl'), true);
  assert.equal(isHandle('-jake'), false);
});

test('taken handles get a short suffix', () => {
  assert.equal(nextHandleCandidate('jake-dcl', 0), 'jake-dcl');
  assert.equal(nextHandleCandidate('jake-dcl', 1), 'jake-dcl-2');
  assert.equal(isHandle(nextHandleCandidate('jake-dcl', 1)), true);
});

test('favorite activities stay inside the existing list', () => {
  assert.equal(isActivity('hike'), true);
  assert.equal(isActivity('paddle'), false);
});
