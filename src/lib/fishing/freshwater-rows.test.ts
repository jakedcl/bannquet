import assert from 'node:assert/strict'
import test from 'node:test'
import { assembleFreshwaterRows, freshwaterLayout } from '@/lib/fishing/freshwater-rows'
import type { FishingLake } from '@/lib/fishing/lakes'
import type { MaineStockingRow } from '@/lib/fishing/maine-stocking'
import type { GaugeView } from '@/lib/fishing/readings'
import type { ActualStocking } from '@/lib/fishing/stocking'

function gauge(overrides: Partial<GaugeView> & Pick<GaugeView, 'site' | 'name' | 'state'>): GaugeView {
  return {
    region: 'Catskills',
    county: 'Ulster',
    lat: null,
    lon: null,
    flow: '120 cfs',
    flowNote: null,
    trend: null,
    height: null,
    heightNote: null,
    temp: '55.0 °F',
    tempNote: null,
    flowState: 'value',
    heightState: 'no-reading',
    tempState: 'value',
    updatedAt: null,
    tempAt: null,
    status: null,
    usgsHref: 'https://example.com',
    verdict: 'High, 2x normal, rising',
    ...overrides,
  }
}

const lake: FishingLake = {
  id: 'ulster-ashokan',
  name: 'ASHOKAN RESERVOIR',
  county: 'Ulster',
  acres: '1',
  species: 'Walleye',
  launch: 'Boat launch',
  note: null,
  lat: null,
  lon: null,
}

const nyStock: ActualStocking = {
  id: '2025-eso-1',
  county: 'Ulster',
  town: 'Olive',
  waterbody: 'ESOPUS CREEK',
  when: 'April 2025',
  number: '1000',
  species: 'Brown trout',
}

const meStock: MaineStockingRow = {
  date: '9/22/2026',
  county: 'Piscataquis',
  water: 'ABOL P',
  town: 'T2 R9',
  species: 'BROOK TROUT',
  quantity: '675',
  sizeInches: '8',
}

test('all states and all types share one list, with links where a state has no table', () => {
  const listing = assembleFreshwaterRows('all', 'all', {
    gauges: [
      gauge({ site: '01445500', name: 'PEQUEST RIVER AT PEQUEST NJ', state: 'New Jersey', region: 'New Jersey' }),
      gauge({ site: '01400000', name: 'BEAVER KILL AT COOKS FALLS NY', state: 'New York' }),
    ],
    lakes: [lake],
    nyStocking: [nyStock],
    meStocking: [meStock],
  })
  const kinds = listing.rows.map((row) => `${row.stateLabel}:${row.kind}:${row.name}`)
  assert.ok(kinds.includes('NJ:River:Pequest River at Pequest'))
  assert.ok(kinds.includes('NY:River:Beaver Kill at Cooks Falls'))
  assert.ok(kinds.includes('NY:Lake:Ashokan Reservoir'))
  assert.ok(kinds.includes('NY:Stocking:Esopus Creek'))
  assert.ok(kinds.includes('ME:Stocking:Abol P'))
  assert.ok(listing.rows.some((row) => row.stateCode === 'vt' && row.kind === 'Lake' && row.external && row.href))
  assert.ok(listing.rows.some((row) => row.stateCode === 'nj' && row.kind === 'Stocking' && row.external))
  assert.equal(listing.rows.some((row) => row.stateCode === 'ny' && row.kind === 'Stocking' && row.external), false)
  assert.equal(listing.sourceLinks.some((link) => link.href.includes('e52k-ymww')), true)
  const pequest = listing.rows.find((row) => row.site === '01445500')
  assert.equal(pequest?.status, 'High, 2x normal, rising')
  assert.equal(pequest?.flow, '120 cfs')
  assert.equal(pequest?.temp, '55.0 °F')
  assert.equal(pequest?.href, '/fishing/01445500')
  const ashokan = listing.rows.find((row) => row.name === 'Ashokan Reservoir')
  assert.equal(ashokan?.status, 'Walleye')
  assert.equal(ashokan?.species, 'Walleye')
  assert.equal(ashokan?.launch, 'Boat launch')
  assert.equal(ashokan?.href, null)
  const esopus = listing.rows.find((row) => row.name === 'Esopus Creek')
  assert.equal(esopus?.status, 'April 2025')
  assert.equal(esopus?.number, '1000')
  const vermont = listing.rows.find((row) => row.stateCode === 'vt' && row.kind === 'Lake')
  assert.equal(vermont?.status, null)
  assert.equal(freshwaterLayout('all', 'rivers'), 'summary')
  assert.equal(freshwaterLayout('ny', 'all'), 'summary')
  assert.equal(freshwaterLayout('nj', 'rivers'), 'River')
  assert.equal(freshwaterLayout('ny', 'lakes'), 'Lake')
  assert.equal(freshwaterLayout('me', 'stocking'), 'Stocking')
})

test('a state with only link-outs still has rows, and a rivers-only filter keeps a links section', () => {
  const lakes = assembleFreshwaterRows('vt', 'lakes', { gauges: [], lakes: [], nyStocking: [], meStocking: [] })
  assert.equal(lakes.rows.length > 0, true)
  assert.equal(lakes.rows.every((row) => row.external && row.kind === 'Lake' && row.stateCode === 'vt'), true)
  assert.deepEqual(lakes.emptyLinks, [])

  const rivers = assembleFreshwaterRows('nh', 'rivers', { gauges: [], lakes: [], nyStocking: [], meStocking: [] })
  assert.deepEqual(rivers.rows, [])
  assert.equal(rivers.emptyLinks.length > 0, true)
})

test('a chosen state and type leave the other lists out', () => {
  const listing = assembleFreshwaterRows('nj', 'rivers', {
    gauges: [
      gauge({ site: '01445500', name: 'PEQUEST RIVER AT PEQUEST NJ', state: 'New Jersey', region: 'New Jersey' }),
      gauge({ site: '01400000', name: 'BEAVER KILL AT COOKS FALLS NY', state: 'New York' }),
    ],
    lakes: [lake],
    nyStocking: [nyStock],
    meStocking: [meStock],
  })
  assert.deepEqual(listing.rows.map((row) => row.site), ['01445500'])
  assert.deepEqual(listing.sourceLinks, [])
})
