import assert from 'node:assert/strict'
import test from 'node:test'
import { nextExtreme, parseCurve, parseExtremes } from '@/lib/fishing/tides'

test('NOAA hi/lo and curve rows become times on the Eastern clock', () => {
  const extremes = parseExtremes([
    { t: '2026-10-17 00:47', v: '4.04', type: 'H' },
    { t: '2026-10-17 06:58', v: '1.428', type: 'L' },
    { t: 'bad', v: '1', type: 'H' },
  ])
  assert.equal(extremes.length, 2)
  assert.equal(extremes[0].kind, 'H')
  assert.equal(extremes[0].feet, 4.04)
  assert.equal(extremes[0].time, Date.parse('2026-10-17T04:47:00Z'))
  assert.equal(parseCurve([{ t: '2026-10-17 01:00', v: '3.9' }])[0].feet, 3.9)
})

test('the next tide is the first extreme still ahead', () => {
  const extremes = parseExtremes([
    { t: '2026-10-17 00:47', v: '4.04', type: 'H' },
    { t: '2026-10-17 06:58', v: '1.428', type: 'L' },
  ])
  const next = nextExtreme(extremes, extremes[0].time)
  assert.equal(next?.kind, 'L')
  assert.equal(nextExtreme(extremes, extremes[1].time), null)
})
