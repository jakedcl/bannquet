import assert from 'node:assert/strict';
import test from 'node:test';
import { inPhotoLinkWindow, routePhotoLinkWindow } from './route-photo-link';

test('route photo link window is 5 s before start and 15 s after end', () => {
  const window = routePhotoLinkWindow('2026-06-01T12:00:00.000Z', '2026-06-01T14:00:00.000Z');
  assert.equal(window.start, '2026-06-01T11:59:55.000Z');
  assert.equal(window.end, '2026-06-01T14:00:15.000Z');
  assert.equal(inPhotoLinkWindow('2026-06-01T11:59:55.000Z', '2026-06-01T12:00:00.000Z', '2026-06-01T14:00:00.000Z'), true);
  assert.equal(inPhotoLinkWindow('2026-06-01T14:00:15.000Z', '2026-06-01T12:00:00.000Z', '2026-06-01T14:00:00.000Z'), true);
  assert.equal(inPhotoLinkWindow('2026-06-01T11:59:54.999Z', '2026-06-01T12:00:00.000Z', '2026-06-01T14:00:00.000Z'), false);
  assert.equal(inPhotoLinkWindow('2026-06-01T14:00:15.001Z', '2026-06-01T12:00:00.000Z', '2026-06-01T14:00:00.000Z'), false);
});