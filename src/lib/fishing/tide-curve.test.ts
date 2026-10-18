import assert from 'node:assert/strict'
import test from 'node:test'
import { cosineCurve, heightAt, tideAxisTicks } from '@/lib/fishing/tide-curve'
import type { TideExtreme } from '@/lib/fishing/tides'

const HOUR = 60 * 60 * 1000

test('a cosine tide is slow at the highs and lows and halfway in the middle', () => {
  const extremes: TideExtreme[] = [
    { time: 0, feet: 1, kind: 'L' },
    { time: 6 * HOUR, feet: 5, kind: 'H' },
  ]
  const curve = cosineCurve(extremes, HOUR)
  assert.equal(curve[0].feet, 1)
  assert.equal(curve[curve.length - 1].feet, 5)
  const middle = curve.find((point) => point.time === 3 * HOUR)
  assert.equal(middle?.feet, 3)
  const early = curve.find((point) => point.time === HOUR)
  assert.ok(early && early.feet < 2)
})

test('the current height is read off the curve', () => {
  assert.equal(heightAt([{ time: 0, feet: 1 }, { time: 100, feet: 3 }], 25), 1.5)
  assert.equal(heightAt([], 0), null)
})

test('tide gridlines stay on whole feet', () => {
  assert.deepEqual(tideAxisTicks(0.2, 5.4), [0, 1, 2, 3, 4, 5, 6])
})
