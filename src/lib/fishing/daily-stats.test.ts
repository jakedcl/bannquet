import assert from 'node:assert/strict'
import test from 'node:test'
import { medianSiteChunks, parseDailyMedians } from '@/lib/fishing/daily-stats'

const SAMPLE = `#
agency_cd	site_no	parameter_cd	ts_id	loc_web_ds	month_nu	day_nu	begin_yr	end_yr	count_nu	p50_va
5s	15s	5s	10n	15s	3n	3n	6n	6n	8n	12s
USGS	01362500	00060	105123		10	17	1932	2026	95	420
USGS	01362500	00060	105123		10	18	1932	2026	95	400
USGS	01435000	00060	1		10	17	1980	2026	20	
`

test('daily statistics stay within the ten-site request limit', () => {
  const sites = Array.from({ length: 22 }, (_, index) => String(index))
  const chunks = medianSiteChunks(sites)
  assert.deepEqual(chunks.map((chunk) => chunk.length), [10, 10, 2])
  assert.deepEqual(medianSiteChunks([]), [])
})

test('daily statistics keep the median for the calendar day', () => {
  assert.deepEqual(parseDailyMedians(SAMPLE, 10, 17), { '01362500': 420 })
  assert.deepEqual(parseDailyMedians(SAMPLE, 1, 1), {})
})
