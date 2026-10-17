import assert from 'node:assert/strict'
import test from 'node:test'
import { freshwaterHref, freshwaterStateCode, readFreshwaterState, readFreshwaterTab } from '@/lib/fishing/freshwater-states'

test('freshwater opens on every state and every water type', () => {
  assert.equal(freshwaterStateCode('New Jersey'), 'nj')
  assert.equal(freshwaterStateCode('Massachusetts'), 'ma')
  assert.equal(readFreshwaterState(undefined), 'all')
  assert.equal(readFreshwaterState('nope'), 'all')
  assert.equal(readFreshwaterState('nj'), 'nj')
  assert.equal(readFreshwaterTab('stocking'), 'stocking')
  assert.equal(readFreshwaterTab('rivers'), 'rivers')
  assert.equal(readFreshwaterTab(undefined), 'all')
  assert.equal(freshwaterHref('all', 'all'), '/fishing/freshwater')
  assert.equal(freshwaterHref('ny', 'rivers'), '/fishing/freshwater?state=ny&tab=rivers')
  assert.equal(freshwaterHref('nj', 'lakes'), '/fishing/freshwater?state=nj&tab=lakes')
})
