import assert from 'node:assert/strict';
import test from 'node:test';
import { isActivity } from './activities';
import {
  DISPLAY_NAME_RULE,
  USERNAME_RULE,
  USERNAME_TAKEN,
  decodeProfileClaim,
  displayNameProblem,
  encodeProfileClaim,
  isUsername,
  nextStopForMember,
  normalizeUsername,
  profileNeedsNames,
  USERNAME_LOCKED,
  usernameAvailability,
  usernameChangeProblem,
  usernameProblem,
} from './handles';

test('usernames are lowercase letters, numbers, and underscores', () => {
  assert.equal(normalizeUsername('  Jake_DCL '), 'jake_dcl');
  assert.equal(isUsername('jake'), true);
  assert.equal(isUsername('jake_dcl'), true);
  assert.equal(isUsername('jake2'), true);
  assert.equal(isUsername('ab'), false);
  assert.equal(isUsername('jake-dcl'), false);
  assert.equal(isUsername('Jake'), false);
  assert.equal(isUsername('jake.dcl'), false);
  assert.equal(usernameProblem(''), 'Pick a username. It is the address of your page.');
  assert.equal(usernameProblem('jake-dcl'), USERNAME_RULE);
  assert.equal(usernameProblem('Jake_DCL'), null);
});

test('a taken username gets a friendly message', () => {
  assert.equal(
    usernameAvailability({ username: 'jake', takenById: 'other', selfId: 'self' }),
    USERNAME_TAKEN,
  );
  assert.equal(usernameAvailability({ username: 'jake', takenById: 'self', selfId: 'self' }), null);
  assert.equal(usernameAvailability({ username: 'jake', takenById: null, selfId: 'self' }), null);
  assert.equal(usernameAvailability({ username: 'no', takenById: null }), USERNAME_RULE);
});

test('a username can be chosen once and then stays put', () => {
  assert.equal(usernameChangeProblem(null, 'ada_trail'), null);
  assert.equal(usernameChangeProblem(null, 'no'), USERNAME_RULE);
  assert.equal(usernameChangeProblem('ada_trail', ''), null);
  assert.equal(usernameChangeProblem('ada_trail', 'Ada_Trail'), null);
  assert.equal(usernameChangeProblem('ada_trail', 'ada_other'), USERNAME_LOCKED);
});

test('display name is required and stays short', () => {
  assert.equal(displayNameProblem(''), DISPLAY_NAME_RULE);
  assert.equal(displayNameProblem('   '), DISPLAY_NAME_RULE);
  assert.equal(displayNameProblem('a'.repeat(81)), 'That name is too long. Keep it under 80 characters.');
  assert.equal(displayNameProblem('Jake'), null);
});

test('sign-in sends people missing a name or username to settings', () => {
  assert.equal(profileNeedsNames({ handle: null, displayName: 'Jake' }), true);
  assert.equal(profileNeedsNames({ handle: 'jake', displayName: null }), true);
  assert.equal(profileNeedsNames({ handle: 'jake', displayName: '   ' }), true);
  assert.equal(profileNeedsNames({ handle: 'jake', displayName: 'Jake' }), false);
  assert.equal(nextStopForMember({ handle: null, displayName: 'Jake' }), '/settings?welcome=1');
  assert.equal(nextStopForMember({ handle: 'jake', displayName: null }), '/settings?welcome=1');
  assert.equal(nextStopForMember({ handle: 'jake', displayName: 'Jake' }), '/user/jake');
});

test('the invite claim only keeps a valid name and username', () => {
  const raw = encodeProfileClaim(' Jake ', 'Jake_DCL');
  assert.deepEqual(decodeProfileClaim(raw), { displayName: 'Jake', username: 'jake_dcl', pending: false });
  assert.deepEqual(decodeProfileClaim(encodeProfileClaim('Ada', 'ada_trail', true)), {
    displayName: 'Ada',
    username: 'ada_trail',
    pending: true,
  });
  assert.equal(decodeProfileClaim('{"displayName":"Jake","username":"jake-dcl"}'), null);
  assert.equal(decodeProfileClaim('not-json'), null);
  assert.equal(decodeProfileClaim(null), null);
});

test('favorite activities stay inside the existing list', () => {
  assert.equal(isActivity('hike'), true);
  assert.equal(isActivity('paddle'), false);
});
