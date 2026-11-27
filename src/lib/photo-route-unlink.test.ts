import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Removing a link by hand records an unlink row so auto-link does not recreate it.
 * (Enforced in SQL via photo_route_unlinks; this documents the rule in tests.)
 */
test('manual unlink blocks a later auto-link for the same pair', () => {
  const unlinks = new Set<string>();
  const links = new Map<string, string>();

  function removeLink(photoId: string, trackId: string) {
    links.delete(`${photoId}:${trackId}`);
    unlinks.add(`${photoId}:${trackId}`);
  }

  function tryAutoLink(photoId: string, trackId: string) {
    if (unlinks.has(`${photoId}:${trackId}`)) return false;
    links.set(`${photoId}:${trackId}`, 'auto');
    return true;
  }

  removeLink('p1', 't1');
  assert.equal(tryAutoLink('p1', 't1'), false);
  assert.equal(tryAutoLink('p2', 't1'), true);
  removeLink('p2', 't1');
  assert.equal(tryAutoLink('p2', 't1'), false);
});