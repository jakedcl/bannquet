import assert from 'node:assert/strict'
import test from 'node:test'
import { indexWaterPlaces, locateWater, type WaterPlace } from '@/lib/fishing/water-places'

function place(overrides: Partial<WaterPlace> & Pick<WaterPlace, 'name' | 'lat' | 'lon'>): WaterPlace {
  return {
    county: 'Ulster',
    state: 'ny',
    ...overrides,
  }
}

test('a stocking lands on the one lake with the same name and county', () => {
  const index = indexWaterPlaces([
    place({ name: 'ASHOKAN RESERVOIR', lat: 41.95, lon: -74.2 }),
    place({ name: 'Pine Pond', county: 'St. Lawrence', lat: 44.25, lon: -74.66 }),
  ])
  assert.deepEqual(locateWater('Ashokan Reservoir', 'Ulster', 'ny', index), { lat: 41.95, lon: -74.2 })
  assert.deepEqual(locateWater('PINE POND', 'St Lawrence', 'ny', index), { lat: 44.25, lon: -74.66 })
})

test('a shorter river name does not inherit a gauge that names a town', () => {
  const index = indexWaterPlaces([
    place({ name: 'ESOPUS CREEK AT ALLABEN NY', county: 'Ulster County', lat: 42.1, lon: -74.3 }),
  ])
  assert.equal(locateWater('Esopus Creek', 'Ulster', 'ny', index), null)
  assert.deepEqual(locateWater('Esopus Creek at Allaben', 'Ulster', 'ny', index), { lat: 42.1, lon: -74.3 })
})

test('repeated names stay unplaced until the county leaves one point', () => {
  const index = indexWaterPlaces([
    place({ name: 'Long Pond', county: 'Warren', lat: 43.68, lon: -73.65 }),
    place({ name: 'Long Pond', county: 'Chenango', lat: 42.42, lon: -75.85 }),
  ])
  assert.equal(locateWater('Long Pond', null, 'ny', index), null)
  assert.equal(locateWater('Long Pond', 'Essex', 'ny', index), null)
  assert.deepEqual(locateWater('Long Pond', 'Warren', 'ny', index), { lat: 43.68, lon: -73.65 })
})

test('another state and two different points are not a match', () => {
  const index = indexWaterPlaces([
    place({ name: 'Mirror Lake', state: 'ny', lat: 44.2, lon: -73.9 }),
    place({ name: 'Twin Pond', lat: 44.1, lon: -73.8 }),
    place({ name: 'Twin Pond', lat: 44.11, lon: -73.81 }),
    place({ name: 'Round Pond', lat: 43.5, lon: -74.1 }),
    place({ name: 'Round Pond', lat: 43.5, lon: -74.1 }),
  ])
  assert.equal(locateWater('Mirror Lake', 'Ulster', 'me', index), null)
  assert.equal(locateWater('Twin Pond', 'Ulster', 'ny', index), null)
  assert.deepEqual(locateWater('Round Pond', 'Ulster', 'ny', index), { lat: 43.5, lon: -74.1 })
  assert.equal(locateWater('No Such Pond', 'Ulster', 'ny', index), null)
})
