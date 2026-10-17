import assert from 'node:assert/strict'
import test from 'node:test'
import { adviceFor } from '@/lib/fishing/advisories'
import { nearestTideStation, SHORE_SPOTS, shoreSpot } from '@/lib/fishing/shore-spots'

test('Staten Island spots use the nearest of the five tide stations', () => {
  assert.equal(SHORE_SPOTS.length, 13)
  assert.equal(nearestTideStation(shoreSpot('great-kills')!).slug, 'great-kills')
  assert.equal(nearestTideStation(shoreSpot('conference-house')!).slug, 'princes-bay')
  assert.equal(nearestTideStation(shoreSpot('faber-park')!).slug, 'bergen-point')
  assert.equal(nearestTideStation(shoreSpot('st-george')!).slug, 'st-george')
  assert.equal(nearestTideStation(shoreSpot('mount-loretto')!).slug, 'princes-bay')
})

test('Arthur Kill and Kill Van Kull stripers are do not eat', () => {
  const striper = adviceFor('kills').find((row) => row.fish === 'Striped bass')
  assert.equal(striper?.general, 'Do not eat')
  assert.equal(striper?.sensitive, 'Do not eat')
})
