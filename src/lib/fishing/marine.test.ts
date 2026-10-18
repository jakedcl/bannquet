import assert from 'node:assert/strict'
import test from 'node:test'
import { pickMarineZone, sensorOrder } from '@/lib/fishing/marine'
import { tideStation } from '@/lib/fishing/tide-stations'

test('Great Kills is the default, and each picker station keeps its CO-OPS id', () => {
  assert.equal(tideStation(undefined).id, '8519436')
  assert.equal(tideStation('nope').slug, 'great-kills')
  assert.equal(tideStation('st-george').id, '8519112')
  assert.equal(tideStation('bergen-point').id, '8519483')
  assert.equal(tideStation('princes-bay').id, '8519726')
  assert.equal(tideStation('sandy-hook').id, '8531680')
})

test('a land forecast zone is skipped for the marine zone', () => {
  assert.equal(pickMarineZone([
    'https://api.weather.gov/zones/forecast/NYZ074',
    'https://api.weather.gov/zones/forecast/ANZ338',
  ]), 'https://api.weather.gov/zones/forecast/ANZ338')
  assert.equal(pickMarineZone(['https://api.weather.gov/zones/forecast/NYZ074']), null)
})

test('harbor stations take Battery water, and the south shore takes Sandy Hook', () => {
  assert.equal(sensorOrder(40.6433, -74.0733)[0], '8518750')
  assert.equal(sensorOrder(40.5433, -74.14)[0], '8531680')
  assert.equal(sensorOrder(40.4669, -74.0094)[0], '8531680')
})
