import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptMove, movementStatus, noteSample, type LockState } from './location';
import { destination } from './geo';

const locked = { lat: 44.11, lng: -73.92 };
const start: LockState = { locked, pending: null };

test('under 1 km keeps the view', () => {
  const sample = destination(locked.lat, locked.lng, 90, 800);
  const next = noteSample(start, 'explore', sample);
  assert.equal(next.showUpdate, false);
  assert.equal(next.recompute, false);
  assert.equal(next.state.pending, null);
  assert.equal(movementStatus('explore', 800).showUpdate, false);
});

test('over 1 km shows the update button and does not recompute until it is tapped', () => {
  const sample = destination(locked.lat, locked.lng, 0, 1_200);
  const next = noteSample(start, 'explore', sample);
  assert.equal(next.showUpdate, true);
  assert.equal(next.recompute, false);
  assert.equal(next.state.locked, locked);
  const accepted = acceptMove(next.state);
  assert.equal(accepted.recompute, true);
  assert.deepEqual(accepted.state.locked, sample);
  assert.equal(accepted.state.pending, null);
});

test('Pick a spot never runs the moved check', () => {
  const sample = destination(locked.lat, locked.lng, 0, 5_000);
  const next = noteSample(start, 'pick', sample);
  assert.equal(next.showUpdate, false);
  assert.equal(next.recompute, false);
  assert.equal(next.state, start);
  assert.equal(movementStatus('pick', 5_000).showUpdate, false);
});
