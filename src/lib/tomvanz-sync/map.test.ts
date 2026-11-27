import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublishedSanityId,
  mapSanityActivity,
  parseSanityImageRef,
  photoAlt,
  photoCaption,
  routePointsFromSanity,
  sanityImageDownloadUrl,
} from './map';

test('Sanity image refs map to CDN URLs with requested params', () => {
  const ref = 'image-abc123-1536x2048-jpg';
  const parsed = parseSanityImageRef(ref);
  assert.ok(parsed);
  const url = sanityImageDownloadUrl(ref, 2000, 85);
  assert.match(url!, /cdn\.sanity\.io\/images\/lee2r8sa\/production\/abc123-1536x2048\.jpg/);
  assert.ok(url!.includes('w=2000'));
  assert.ok(url!.includes('h=2000'));
  assert.ok(url!.includes('fit=max'));
  assert.ok(url!.includes('fm=jpg'));
  assert.ok(url!.includes('q=85'));
  assert.ok(!url!.includes('auto=format'));
});

test('photo caption and alt follow Tomvanz rules', () => {
  assert.equal(photoCaption(' Summit ', ' note '), 'Summit');
  assert.equal(photoCaption(null, ' only note '), 'only note');
  assert.equal(photoAlt(null), 'Photo');
  assert.equal(photoAlt(' Ridge '), 'Ridge');
});

test('track activities map hike and bike only', () => {
  assert.equal(mapSanityActivity('hike'), 'hike');
  assert.equal(mapSanityActivity('bike'), 'bike');
  assert.equal(mapSanityActivity('other'), 'skip');
  assert.equal(mapSanityActivity(null), 'skip');
});

test('route coordinates parse lng,lat pairs', () => {
  const points = routePointsFromSanity('[[-73.95,44.15],[-73.94,44.16]]');
  assert.equal(points.length, 2);
  assert.equal(points[0]?.lng, -73.95);
  assert.equal(points[0]?.lat, 44.15);
});

test('draft and version Sanity ids are rejected', () => {
  assert.equal(isPublishedSanityId('drafts.foo'), false);
  assert.equal(isPublishedSanityId('versions.foo'), false);
  assert.equal(isPublishedSanityId('abc-123'), true);
});