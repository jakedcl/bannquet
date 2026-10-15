import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMaineStocking } from './maine-stocking'

const SAMPLE = `
CountyAndroscoggin
ANDROSCOGGIN R BROOK TROUT4/21/2026 LISBON 300 10
ANDROSCOGGIN R (LITTLE) BROWN TROUT4/22/2026 MECHANIC FALLS 300 9
AUBURN L L.L. SALMON4/27/2026 AUBURN 1000 7
BAD LINE 4/21/2026 TOWN
CountyAndroscogginEnd of :
Page 1 of 34 10/13/2026Preliminary Stocking Receipt Data - This data is correct to the best of our
knowledge at this time.
`.trim()

test('maine stocking rows keep the printed date, water, and town', () => {
  const report = parseMaineStocking(SAMPLE)
  assert.equal(report.preliminary, true)
  assert.equal(report.asOf, '10/13/2026')
  assert.equal(report.rows.length, 3)
  assert.deepEqual(report.rows[0], {
    date: '4/21/2026',
    county: 'Androscoggin',
    water: 'ANDROSCOGGIN R',
    town: 'LISBON',
    species: 'BROOK TROUT',
    quantity: '300',
    sizeInches: '10',
  })
  assert.equal(report.rows[1].town, 'MECHANIC FALLS')
  assert.equal(report.rows[1].water, 'ANDROSCOGGIN R (LITTLE)')
  assert.equal(report.rows[2].species, 'L.L. SALMON')
  assert.equal(report.skipped, 1)
})
