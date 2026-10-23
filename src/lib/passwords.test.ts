import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  RESET_LINK_TTL_MS,
  hashResetToken,
  passwordAuthError,
  passwordProblem,
  passwordResetAudit,
  resetLinkExpiry,
  resetLinkState,
  signInFailureReason,
} from './passwords';

test('passwords only need a short length', () => {
  assert.equal(passwordProblem(''), 'Type a password.');
  assert.match(passwordProblem('short') ?? '', /at least 8/);
  assert.equal(passwordProblem('1'.repeat(MIN_PASSWORD_LENGTH)), null);
  assert.equal(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH)), null);
  assert.match(passwordProblem('a'.repeat(MAX_PASSWORD_LENGTH + 1)) ?? '', /under 128/);
});

test('reset links last a day and work once', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  assert.equal(resetLinkState(null, now), 'missing');
  assert.equal(
    resetLinkState({ expiresAt: new Date('2026-10-15T12:00:00Z'), usedAt: null }, now),
    'open',
  );
  assert.equal(
    resetLinkState({ expiresAt: new Date('2026-10-14T12:00:00Z'), usedAt: null }, now),
    'expired',
  );
  assert.equal(
    resetLinkState(
      { expiresAt: new Date('2026-10-15T12:00:00Z'), usedAt: new Date('2026-10-14T13:00:00Z') },
      now,
    ),
    'used',
  );
  assert.equal(resetLinkExpiry(now).getTime() - now.getTime(), RESET_LINK_TTL_MS);
  assert.equal(RESET_LINK_TTL_MS, 24 * 60 * 60 * 1000);
});

test('the reset log stores a hash, never the link secret or a password', () => {
  const token = 'unit-test-reset-token';
  const audit = passwordResetAudit({
    actorId: 'admin-1',
    targetUserId: 'friend-1',
    emailed: true,
    token,
  });
  assert.equal(audit.tokenHash, hashResetToken(token));
  assert.notEqual(audit.tokenHash, token);
  const saved = JSON.stringify(audit);
  assert.equal(saved.includes(token), false);
  assert.equal(Object.hasOwn(audit, 'password'), false);
  assert.equal(Object.hasOwn(audit, 'token'), false);
  assert.deepEqual(Object.keys(audit).sort(), ['actorId', 'emailed', 'targetUserId', 'tokenHash']);
});

test('sign-in failures classify password mistakes separately from other auth errors', () => {
  assert.equal(signInFailureReason({ code: 'INVALID_EMAIL_OR_PASSWORD' }), 'wrong_password');
  assert.equal(signInFailureReason({ message: 'Invalid credentials' }), 'wrong_password');
  assert.equal(signInFailureReason({ code: 'SOMETHING_ELSE' }), 'auth_error');
});

test('auth failures stay in plain language', () => {
  assert.match(passwordAuthError({ code: 'TOO_MANY_ATTEMPTS' }, 'nope'), /Wait a few minutes/);
  assert.match(passwordAuthError({ code: 'USER_ALREADY_EXISTS' }, 'nope'), /already has an account/);
  assert.match(passwordAuthError({ message: 'something else' }, 'Try the sign-in page.'), /sign-in page/);
});
