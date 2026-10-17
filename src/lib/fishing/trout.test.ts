import assert from 'node:assert/strict'
import test from 'node:test'
import { troutStreamStatus } from '@/lib/fishing/trout'

test('inland trout streams switch to catch and release on October 16', () => {
  assert.match(troutStreamStatus('2026-10-15').title, /open/i)
  assert.match(troutStreamStatus('2026-10-16').title, /catch and release/i)
  assert.match(troutStreamStatus('2026-04-01').detail, /5 fish/)
  assert.match(troutStreamStatus('2026-03-31').detail, /Artificial lures/)
})
