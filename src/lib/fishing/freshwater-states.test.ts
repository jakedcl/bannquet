import assert from 'node:assert/strict'
import test from 'node:test'
import { freshwaterHref, freshwaterStateCode, readFreshwaterState, readFreshwaterTab } from '@/lib/fishing/freshwater-states'

test('freshwater states read USGS names and stay on NY rivers by default', () => {
  assert.equal(freshwaterStateCode('New Jersey'), 'nj')
  assert.equal(freshwaterStateCode('Massachusetts'), 'ma')
  assert.equal(readFreshwaterState(undefined), 'ny')
  assert.equal(readFreshwaterState('nope'), 'ny')
  assert.equal(readFreshwaterTab('stocking'), 'stocking')
  assert.equal(readFreshwaterTab(undefined), 'rivers')
  assert.equal(freshwaterHref('ny', 'rivers'), '/fishing/freshwater')
  assert.equal(freshwaterHref('nj', 'lakes'), '/fishing/freshwater?state=nj&tab=lakes')
})
