import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWaterDataKey } from './usgs'

test('a water data key drops quotes and a pasted parameter name', () => {
  assert.equal(normalizeWaterDataKey('  "abc123"  '), 'abc123')
  assert.equal(normalizeWaterDataKey("'abc123'"), 'abc123')
  assert.equal(normalizeWaterDataKey('api_key=abc123'), 'abc123')
  assert.equal(normalizeWaterDataKey('X-Api-Key: abc123'), 'abc123')
  assert.equal(normalizeWaterDataKey('   '), null)
  assert.equal(normalizeWaterDataKey(undefined), null)
})
