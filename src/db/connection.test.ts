import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseConnectionString } from './connection';

test('database URLs use sslmode=verify-full', () => {
  const url = databaseConnectionString(
    'postgresql://user:pass@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  );
  assert.match(url, /sslmode=verify-full/);
  assert.doesNotMatch(url, /sslmode=require/);
});
