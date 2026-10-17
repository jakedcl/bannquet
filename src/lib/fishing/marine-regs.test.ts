import assert from 'node:assert/strict'
import test from 'node:test'
import { openSpecies, regulationOn, MARINE_SPECIES } from '@/lib/fishing/marine-regs'

const byId = Object.fromEntries(MARINE_SPECIES.map((species) => [species.id, species]))

test('October 17 2026 marine seasons match the DEC table', () => {
  const fluke = regulationOn(byId.fluke, '2026-10-17')
  assert.equal(fluke.status, 'Closed')
  const bass = regulationOn(byId['striped-bass-marine'], '2026-10-17')
  assert.equal(bass.status, 'Open')
  assert.equal(bass.size, '28–31" slot')
  assert.equal(bass.bag, '1')
  const porgy = regulationOn(byId.porgy, '2026-10-17')
  assert.equal(porgy.status, 'Open')
  assert.equal(porgy.size, '9.5" shore, 11" boat')
  const blackfish = regulationOn(byId['blackfish-bight'], '2026-10-17')
  assert.equal(blackfish.status, 'Open')
  assert.equal(blackfish.bag, '4')
  const seaBass = regulationOn(byId['black-sea-bass'], '2026-10-17')
  assert.equal(seaBass.status, 'Open')
  assert.equal(seaBass.bag, '6')
  const open = openSpecies('2026-10-17').map((row) => row.id)
  assert.ok(open.includes('bluefish'))
  assert.ok(open.includes('weakfish'))
  assert.equal(open.includes('fluke'), false)
  assert.equal(open.includes('winter-flounder'), false)
})

test('spring blackfish and early fluke use the first limit', () => {
  assert.equal(regulationOn(byId['blackfish-bight'], '2026-04-15').bag, '2')
  assert.equal(regulationOn(byId['blackfish-bight'], '2026-05-01').status, 'Closed')
  assert.equal(regulationOn(byId.fluke, '2026-05-04').size, '19"')
  assert.equal(regulationOn(byId.fluke, '2026-08-02').size, '19.5"')
  assert.equal(regulationOn(byId['black-sea-bass'], '2026-05-16').bag, '3')
})
