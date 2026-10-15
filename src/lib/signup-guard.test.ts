import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dropGibberishGmail,
  gmailHasManyDots,
  issueSignupStamp,
  looksLikeGibberishName,
  readSignupStamp,
  signupLimited,
} from './signup-guard';

test('ordinary names are not gibberish', () => {
  for (const name of ['Jake', 'John Giacon', 'Mary-Jane', 'Christopher McAllister', 'DeAndre Hopkins', 'Szczytnicki']) {
    assert.equal(looksLikeGibberishName(name), false, name);
  }
});

test('long mixed-case names with no vowels are gibberish', () => {
  assert.equal(looksLikeGibberishName('kJdHfGwPqLmNbV'), true);
  assert.equal(looksLikeGibberishName('XqZvTpNmLrWkHyB'), true);
});

test('gmail dots are counted only for gmail.com and only at 3+', () => {
  assert.equal(gmailHasManyDots('a.b.c.d@gmail.com'), true);
  assert.equal(gmailHasManyDots('A.B.C.D@gmail.com'), true);
  assert.equal(gmailHasManyDots('a.b.c@gmail.com'), false);
  assert.equal(gmailHasManyDots('john.smith@gmail.com'), false);
  assert.equal(gmailHasManyDots('a.b.c.d@example.com'), false);
});

test('both the name and the gmail pattern are required', () => {
  assert.equal(dropGibberishGmail('kJdHfGwPqLmNbV', 'a.b.c.d@gmail.com'), true);
  assert.equal(dropGibberishGmail('Jake', 'a.b.c.d@gmail.com'), false);
  assert.equal(dropGibberishGmail('kJdHfGwPqLmNbV', 'jake@example.com'), false);
});

test('a signed stamp rejects anything faster than 3 seconds', () => {
  const now = 1_700_000_000_000;
  const stamp = issueSignupStamp(now);
  assert.equal(readSignupStamp(stamp, now + 1000), 'fast');
  assert.equal(readSignupStamp(stamp, now + 3000), 'ok');
  assert.equal(readSignupStamp('1.nope', now + 5000), 'bad');
});

test('five sign-ups an hour from one address are allowed', () => {
  const ip = `test-${Date.now()}`;
  const start = 1_800_000_000_000;
  for (let i = 0; i < 5; i += 1) assert.equal(signupLimited(ip, start + i), false);
  assert.equal(signupLimited(ip, start + 10), true);
  assert.equal(signupLimited(ip, start + 60 * 60 * 1000 + 11), false);
});
