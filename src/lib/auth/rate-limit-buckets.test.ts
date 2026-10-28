import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCOUNT_FAILURES, NETWORK_FAILURES, resetBuckets, signInBuckets } from './rate-limit-buckets';

test('sign-in lockout is per account and network, plus a high network cap', () => {
  const buckets = signInBuckets({ ip: '1.2.3.4', email: 'Jake@Example.com', login: 'jakedcl' });
  assert.deepEqual(buckets, [
    { key: 'ip:1.2.3.4', max: NETWORK_FAILURES },
    { key: 'acct:jake@example.com|ip:1.2.3.4', max: ACCOUNT_FAILURES },
  ]);
  assert.ok(NETWORK_FAILURES > ACCOUNT_FAILURES);
});

test('the same account from another network gets its own bucket', () => {
  const home = signInBuckets({ ip: '1.1.1.1', login: 'jakedcl' }).map((bucket) => bucket.key);
  const elsewhere = signInBuckets({ ip: '9.9.9.9', login: 'jakedcl' }).map((bucket) => bucket.key);
  assert.equal(home.filter((key) => elsewhere.includes(key)).length, 0);
});

test('reset requests are capped per address and per network', () => {
  const keys = resetBuckets({ ip: '1.2.3.4', email: 'A@B.com' }).map((bucket) => bucket.key);
  assert.deepEqual(keys, ['reset:a@b.com', 'reset-ip:1.2.3.4']);
});
