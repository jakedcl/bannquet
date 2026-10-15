import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWaterDataKey, waterDataKey } from './usgs'

test('a water data key drops quotes and a pasted parameter name', () => {
  assert.equal(normalizeWaterDataKey('  "abc123"  '), 'abc123')
  assert.equal(normalizeWaterDataKey("'abc123'"), 'abc123')
  assert.equal(normalizeWaterDataKey('api_key=abc123'), 'abc123')
  assert.equal(normalizeWaterDataKey('X-Api-Key: abc123'), 'abc123')
  assert.equal(normalizeWaterDataKey('   '), null)
  assert.equal(normalizeWaterDataKey(undefined), null)
})

test('a water data key is used only when it is 40 alphanumeric characters', () => {
  const previous = process.env.USGS_WATER_DATA_API_KEY
  const alias = process.env.WATER_DATA_API_KEY
  process.env.USGS_WATER_DATA_API_KEY = 'short-key'
  delete process.env.WATER_DATA_API_KEY
  assert.equal(waterDataKey(), null)
  process.env.USGS_WATER_DATA_API_KEY = 'a'.repeat(40)
  assert.equal(waterDataKey(), 'a'.repeat(40))
  if (previous === undefined) delete process.env.USGS_WATER_DATA_API_KEY
  else process.env.USGS_WATER_DATA_API_KEY = previous
  if (alias === undefined) delete process.env.WATER_DATA_API_KEY
  else process.env.WATER_DATA_API_KEY = alias
})
