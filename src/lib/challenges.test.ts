import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeProgress, climbButtonLabel, groupPeaks, loadChallenges, loadGroups, peaksNearTrack, suggestSummits, SUMMIT_MATCH_METERS, SUMMIT_SUGGEST_METERS } from './challenges';

test('the starter challenges are the Adirondack 46 and the New Hampshire 48', () => {
  const challenges = loadChallenges();
  const adk = challenges.find((challenge) => challenge.id === 'adk46');
  const nh = challenges.find((challenge) => challenge.id === 'nh48');
  const cats = challenges.find((challenge) => challenge.id === 'cat3500');
  const vt = challenges.find((challenge) => challenge.id === 'vt4000');
  const me = challenges.find((challenge) => challenge.id === 'me4000');
  assert.equal(adk?.peaks.length, 46);
  assert.equal(nh?.peaks.length, 48);
  assert.equal(cats?.peaks.length, 35);
  assert.equal(cats?.peaks.filter((peak) => peak.winter).length, 4);
  assert.equal(vt?.peaks.length, 5);
  assert.equal(me?.peaks.length, 14);
  assert.equal(adk?.short, 'ADK 46');
  assert.equal(nh?.short, 'NH 48');
  const ne = loadGroups().find((group) => group.id === 'ne67');
  if (!ne) throw new Error('missing ne67');
  assert.equal(groupPeaks(ne).length, 67);
  assert.equal(climbButtonLabel(0), 'I climbed this');
  assert.equal(climbButtonLabel(2), 'I climbed this again');
  const slugs = challenges.flatMap((challenge) => challenge.peaks.map((peak) => peak.slug));
  assert.equal(new Set(slugs).size, slugs.length);
  for (const peak of adk?.peaks ?? []) {
    assert.ok(peak.lat > 43.9 && peak.lat < 44.6, peak.slug);
    assert.ok(peak.lng < -73.6 && peak.lng > -74.4, peak.slug);
  }
  for (const peak of nh?.peaks ?? []) {
    assert.ok(peak.lat > 43.8 && peak.lat < 44.7, peak.slug);
    assert.ok(peak.lng < -71.0 && peak.lng > -72.0, peak.slug);
  }
});

test('a route credits a summit it passes and ignores the next mountain', () => {
  const marcy = loadChallenges().flatMap((challenge) => challenge.peaks).find((peak) => peak.slug === 'adk46_marcy');
  const algonquin = loadChallenges().flatMap((challenge) => challenge.peaks).find((peak) => peak.slug === 'adk46_algonquin_peak');
  assert.ok(marcy && algonquin);
  const near = { lat: marcy.lat + 100 / 111_320, lng: marcy.lng, ele: null };
  const far = { lat: marcy.lat + 400 / 111_320, lng: marcy.lng, ele: null };
  assert.deepEqual(peaksNearTrack([near], [marcy, algonquin]), ['adk46_marcy']);
  assert.deepEqual(peaksNearTrack([far], [marcy, algonquin]), []);

  const west = { lat: marcy.lat, lng: marcy.lng - 300 / (111_320 * Math.cos((marcy.lat * Math.PI) / 180)), ele: null };
  const east = { lat: marcy.lat, lng: marcy.lng + 300 / (111_320 * Math.cos((marcy.lat * Math.PI) / 180)), ele: null };
  assert.deepEqual(peaksNearTrack([west, east], [marcy]), ['adk46_marcy']);
  assert.ok(SUMMIT_MATCH_METERS < 200);
  assert.equal(SUMMIT_SUGGEST_METERS, 50);
});

test('a route suggests a summit within 50 m and skips one already climbed', () => {
  const marcy = loadChallenges().flatMap((challenge) => challenge.peaks).find((peak) => peak.slug === 'adk46_marcy');
  const algonquin = loadChallenges().flatMap((challenge) => challenge.peaks).find((peak) => peak.slug === 'adk46_algonquin_peak');
  assert.ok(marcy && algonquin);
  const close = { lat: marcy.lat + 40 / 111_320, lng: marcy.lng, ele: null };
  const hundred = { lat: marcy.lat + 100 / 111_320, lng: marcy.lng, ele: null };
  assert.deepEqual(suggestSummits([close], new Set(), [marcy, algonquin]), [{ slug: marcy.slug, name: marcy.name }]);
  assert.deepEqual(suggestSummits([hundred], new Set(), [marcy, algonquin]), []);
  assert.deepEqual(suggestSummits([close], new Set([marcy.slug]), [marcy, algonquin]), []);
});

test('finishing every peak on a list is the only way to complete it', () => {
  assert.equal(challengeProgress(46, 45).complete, false);
  assert.equal(challengeProgress(46, 46).complete, true);
  assert.equal(challengeProgress(46, 50).climbed, 46);
});
