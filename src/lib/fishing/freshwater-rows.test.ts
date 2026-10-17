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
  assert.equal(lakes.rows.every((row) => row.lat == null && row.lon == null), true)
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

test('map points come from the water itself or one same-state name match', () => {
  const sources = {
    gauges: [
      gauge({ site: '01445500', name: 'PEQUEST RIVER AT PEQUEST NJ', state: 'New Jersey', region: 'New Jersey', county: 'Warren', lat: 40.8, lon: -74.9 }),
      gauge({ site: '01362200', name: 'ESOPUS CREEK AT ALLABEN NY', state: 'New York', county: 'Ulster County', lat: 42.1, lon: -74.3 }),
      gauge({ site: '1', name: 'MIRROR LAKE NY', state: 'New York', county: 'Essex', lat: 44.2, lon: -73.9 }),
    ],
    lakes: [
      { ...lake, lat: 41.95, lon: -74.2 },
      { ...lake, id: 'long-warren', name: 'LONG POND', county: 'Warren', lat: 43.68, lon: -73.65 },
      { ...lake, id: 'long-chenango', name: 'LONG POND', county: 'Chenango', lat: 42.42, lon: -75.85 },
      { ...lake, id: 'mirror', name: 'MIRROR LAKE', county: 'Essex', lat: null, lon: null },
      { ...lake, id: 'hidden', name: 'HIDDEN POND', county: 'Essex', lat: null, lon: null },
    ],
    nyStocking: [
      nyStock,
      { ...nyStock, id: 'ash', waterbody: 'ASHOKAN RESERVOIR', county: 'Ulster' },
      { ...nyStock, id: 'long-w', waterbody: 'Long Pond', county: 'Warren' },
      { ...nyStock, id: 'long-open', waterbody: 'Long Pond', county: null },
      { ...nyStock, id: 'mystery', waterbody: 'No Such Pond', county: 'Essex' },
    ],
    meStocking: [{ ...meStock, water: 'ASHOKAN RESERVOIR', county: 'Ulster' }],
  }
  const listing = assembleFreshwaterRows('all', 'all', sources)
  assert.equal(listing.rows.find((row) => row.site === '01445500')?.lat, 40.8)
  assert.equal(listing.rows.find((row) => row.kind === 'Lake' && row.name === 'Ashokan Reservoir')?.lon, -74.2)
  const stockedAshokan = listing.rows.find((row) => row.kind === 'Stocking' && row.stateCode === 'ny' && row.name === 'Ashokan Reservoir')
  assert.equal(stockedAshokan?.lat, 41.95)
  assert.equal(stockedAshokan?.lon, -74.2)
  assert.equal(listing.rows.find((row) => row.kind === 'Stocking' && row.name === 'Esopus Creek')?.lat, null)
  assert.equal(listing.rows.find((row) => row.id === 'ny-stock-long-w')?.lat, 43.68)
  assert.equal(listing.rows.find((row) => row.id === 'ny-stock-long-open')?.lat, null)
  assert.equal(listing.rows.find((row) => row.name === 'No Such Pond')?.lat, null)
  assert.equal(listing.rows.find((row) => row.stateCode === 'me' && row.name === 'Ashokan Reservoir')?.lat, null)
  assert.equal(listing.rows.find((row) => row.name === 'Mirror Lake')?.lat, 44.2)
  assert.equal(listing.rows.find((row) => row.name === 'Hidden Pond')?.lat, null)

  const rivers = assembleFreshwaterRows('nj', 'rivers', sources)
  assert.deepEqual(rivers.rows.map((row) => row.kind), ['River'])
  assert.equal(rivers.rows[0]?.lat, 40.8)
  const lakesOnly = assembleFreshwaterRows('ny', 'lakes', sources)
  assert.equal(lakesOnly.rows.every((row) => row.kind === 'Lake'), true)
  assert.equal(lakesOnly.rows.some((row) => row.lat != null), true)
  const stocked = assembleFreshwaterRows('ny', 'stocking', sources)
  assert.equal(stocked.rows.every((row) => row.kind === 'Stocking'), true)
  assert.equal(stocked.rows.find((row) => row.name === 'Ashokan Reservoir')?.lat, 41.95)
})
