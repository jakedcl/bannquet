import assert from 'node:assert/strict'
import test from 'node:test'
import { easternDate, zonedStamp } from '@/lib/fishing/clock'
import { skyFor } from '@/lib/fishing/sky'

const LAT = 40.54
const LON = -74.14
const NOON = Date.parse('2026-10-17T16:00:00Z')

function localMinutes(time: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(time)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  return hour * 60 + minute
}

test('an Eastern NOAA stamp in October is EDT', () => {
  assert.equal(zonedStamp('2026-10-17 07:10'), Date.parse('2026-10-17T11:10:00Z'))
  assert.equal(easternDate(Date.parse('2026-10-17T03:30:00Z')), '2026-10-16')
})

test('Staten Island sun, moon, and solunar periods match the almanac for 17 Oct 2026', () => {
  const sky = skyFor(LAT, LON, NOON)
  assert.equal(sky.moonPhase, 'Waxing crescent')
  assert.ok(sky.sunrise)
  assert.ok(sky.sunset)
  assert.ok(Math.abs(localMinutes(sky.sunrise) - (7 * 60 + 10)) <= 4)
  assert.ok(Math.abs(localMinutes(sky.sunset) - (18 * 60 + 13)) <= 4)

  const majors = sky.periods.filter((period) => period.label === 'Major')
  const minors = sky.periods.filter((period) => period.label === 'Minor')
  assert.ok(majors.length >= 1)
  assert.ok(minors.length >= 1)
  const overhead = majors.map((period) => (period.start + period.end) / 2).find((center) => localMinutes(center) > 12 * 60)
  assert.ok(overhead)
  assert.ok(Math.abs(localMinutes(overhead) - (18 * 60 + 24)) <= 12)
  const moonrise = minors.map((period) => (period.start + period.end) / 2).find((center) => localMinutes(center) > 12 * 60 && localMinutes(center) < 18 * 60)
  assert.ok(moonrise)
  assert.ok(Math.abs(localMinutes(moonrise) - (13 * 60 + 55)) <= 12)
})
