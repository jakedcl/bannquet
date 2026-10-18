import assert from 'node:assert/strict'
import test from 'node:test'
import { flowVerdict } from '@/lib/fishing/flow-verdict'
import { plainWaterName } from '@/lib/fishing/readings'

test('a river is compared with the daily median and the 24h change', () => {
  assert.equal(flowVerdict(200, 100, '+40'), 'High, 2x normal, rising')
  assert.equal(flowVerdict(50, 100, '-20'), 'Low, 0.5x normal, falling')
  assert.equal(flowVerdict(100, 100, '+1'), 'Normal, near the median, steady')
  assert.equal(flowVerdict(200, null, '+40'), 'Rising')
  assert.equal(flowVerdict(null, 100, '+1'), null)
})

test('USGS names become plain language', () => {
  assert.equal(plainWaterName('NEVERSINK RIVER NEAR CLARYVILLE NY'), 'Neversink River near Claryville')
  assert.equal(plainWaterName('ESOPUS CREEK AT ALLABEN NY'), 'Esopus Creek at Allaben')
})
