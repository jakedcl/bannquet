import assert from 'node:assert/strict';
import test from 'node:test';
import { OFFLINE_RADIUS_M } from './constants';
import type { OfflineAreaRecord } from './offline';
import {
  effectivelyOffline,
  findCoveringArea,
  offlineExploreCheck,
  startScreenUi,
} from './start-screen-offline';

const AREA: OfflineAreaRecord = {
  id: 'a1',
  name: 'Near Slide Mountain',
  lat: 41.998,
  lng: -74.386,
  radiusM: OFFLINE_RADIUS_M,
  savedAt: '2026-01-01T00:00:00.000Z',
  terrainUrls: [],
  peakUrls: [],
};

test('online start screen shows pick map and save offline', () => {
  const ui = startScreenUi(false, 1);
  assert.equal(ui.showPickMap, true);
  assert.equal(ui.showSaveOffline, true);
  assert.equal(ui.showOfflineBadge, false);
  assert.equal(ui.showSavedAreasList, false);
});

test('offline start screen hides pick and save, shows badge and saved list', () => {
  const empty = startScreenUi(true, 0);
  assert.equal(empty.showPickMap, false);
  assert.equal(empty.showSaveOffline, false);
  assert.equal(empty.showOfflineBadge, true);
  assert.equal(empty.showSavedAreasList, false);
  const withAreas = startScreenUi(true, 2);
  assert.equal(withAreas.showSavedAreasList, true);
});

test('effectivelyOffline treats failed reachability as offline', () => {
  assert.equal(effectivelyOffline(true, false), true);
  assert.equal(effectivelyOffline(false, true), true);
  assert.equal(effectivelyOffline(true, true), false);
});

test('offline explore proceeds inside a saved area and blocks outside', () => {
  assert.equal(offlineExploreCheck([AREA], AREA.lat, AREA.lng, true), 'proceed');
  assert.equal(offlineExploreCheck([AREA], 40.7, -74.0, true), 'outside');
  assert.equal(offlineExploreCheck([AREA], 40.7, -74.0, false), 'proceed');
});

test('findCoveringArea matches offlineExploreCheck', () => {
  const inside = { lat: AREA.lat, lng: AREA.lng };
  assert.ok(findCoveringArea([AREA], inside.lat, inside.lng));
  assert.equal(findCoveringArea([AREA], 40.7, -74.0), null);
});
