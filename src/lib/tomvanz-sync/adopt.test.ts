import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesAdoptCandidate, pickAdoptCandidate, type AdoptCandidate } from './adopt';
import { TOMVANZ_OWNER_ID } from './constants';

const incoming = {
  lat: 44.15,
  lng: -73.95,
  distanceM: 25_000,
  ownerId: TOMVANZ_OWNER_ID,
};

test('adopt match requires same owner, start proximity, and distance tolerance', () => {
  const close: AdoptCandidate = {
    id: 'e009d50c-3d15-4ed5-ab82-ebca0ffce4a6',
    lat: 44.15001,
    lng: -73.95001,
    distanceM: 25_200,
    ownerId: TOMVANZ_OWNER_ID,
    externalLinked: false,
  };
  assert.equal(matchesAdoptCandidate(close, incoming), true);

  const wrongOwner = { ...close, ownerId: 'other-user' };
  assert.equal(matchesAdoptCandidate(wrongOwner, incoming), false);

  const alreadyLinked = { ...close, externalLinked: true };
  assert.equal(matchesAdoptCandidate(alreadyLinked, incoming), false);

  const far = { ...close, lat: 44.2 };
  assert.equal(matchesAdoptCandidate(far, incoming), false);

  const long = { ...close, distanceM: 30_000 };
  assert.equal(matchesAdoptCandidate(long, incoming), false);
});

test('pickAdoptCandidate returns first matching row', () => {
  const candidates: AdoptCandidate[] = [
    {
      id: 'a',
      lat: 44.1,
      lng: -74,
      distanceM: 10_000,
      ownerId: TOMVANZ_OWNER_ID,
      externalLinked: false,
    },
    {
      id: 'b',
      lat: 44.15001,
      lng: -73.95001,
      distanceM: 25_200,
      ownerId: TOMVANZ_OWNER_ID,
      externalLinked: false,
    },
  ];
  assert.equal(pickAdoptCandidate(candidates, incoming)?.id, 'b');
});