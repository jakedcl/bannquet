import assert from 'node:assert/strict';
import test from 'node:test';
import { POST_KIND_LABELS, isPostKind } from './post-kinds';

test('a post is a trip report or a general note', () => {
  assert.equal(isPostKind('trip_report'), true);
  assert.equal(isPostKind('general'), true);
  assert.equal(isPostKind('note'), false);
  assert.equal(POST_KIND_LABELS.trip_report, 'Trip report');
  assert.equal(POST_KIND_LABELS.general, 'General');
});
