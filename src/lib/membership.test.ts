import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminEmailsFromEnv,
  inviteState,
  isAdminEmail,
  isEmail,
  normalizeEmail,
  accountCreateAllowed,
  signInAllowed,
} from './membership';

test('emails are trimmed and compared in lowercase', () => {
  assert.equal(normalizeEmail('  Jake@Example.com '), 'jake@example.com');
  assert.equal(isEmail('jake@example.com'), true);
  assert.equal(isEmail('not an email'), false);
  assert.deepEqual(adminEmailsFromEnv(' Jake@Example.com, friend@bannquet.com '), [
    'jake@example.com',
    'friend@bannquet.com',
  ]);
  assert.equal(isAdminEmail('Jake@Example.com', ['jake@example.com']), true);
});

test('an invite is open until it is used or expires', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  assert.equal(inviteState(null, now), 'missing');
  assert.equal(
    inviteState({ email: 'a@b.co', expiresAt: new Date('2026-10-20T12:00:00Z'), usedAt: null }, now),
    'open',
  );
  assert.equal(
    inviteState({ email: 'a@b.co', expiresAt: new Date('2026-10-01T12:00:00Z'), usedAt: null }, now),
    'expired',
  );
  assert.equal(
    inviteState(
      { email: 'a@b.co', expiresAt: new Date('2026-10-20T12:00:00Z'), usedAt: new Date('2026-10-13T11:00:00Z') },
      now,
    ),
    'used',
  );
});

test('password sign-in is limited to members and admins', () => {
  const admins = ['jake@example.com'];
  assert.equal(signInAllowed({ email: 'jake@example.com', adminEmails: admins, member: false }), true);
  assert.equal(signInAllowed({ email: 'friend@example.com', adminEmails: admins, member: true }), true);
  assert.equal(signInAllowed({ email: 'stranger@example.com', adminEmails: admins, member: false }), false);
  assert.equal(signInAllowed({ email: 'nope', adminEmails: admins, member: true }), false);
});

test('only an open invite can create an account', () => {
  const admins = ['jake@example.com'];
  assert.equal(
    accountCreateAllowed({ email: 'friend@example.com', adminEmails: admins, member: false, openInvite: true }),
    true,
  );
  assert.equal(
    accountCreateAllowed({ email: 'friend@example.com', adminEmails: admins, member: true, openInvite: true }),
    false,
  );
  assert.equal(
    accountCreateAllowed({ email: 'stranger@example.com', adminEmails: admins, member: false, openInvite: false }),
    false,
  );
  assert.equal(
    accountCreateAllowed({ email: 'jake@example.com', adminEmails: admins, member: false, openInvite: false }),
    true,
  );
});
