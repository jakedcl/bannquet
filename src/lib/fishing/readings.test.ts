import assert from 'node:assert/strict'
import test from 'node:test'
import { assembleGauges, chooseSeries, formatAge, formatEastern, formatFlowDelta, type Observation, type SeriesMeta } from './readings'

const NOW = Date.parse('2026-10-15T16:00:00Z')

function series(partial: Partial<SeriesMeta> & Pick<SeriesMeta, 'id' | 'parameterCode'>): SeriesMeta {
  return {
    monitoringLocationId: 'USGS-01435000',
    statisticId: '00011',
    primary: 'Primary',
    webDescription: null,
    sublocation: null,
    endUtc: '2026-10-15T15:15:00Z',
    ...partial,
  }
}

function observation(partial: Partial<Observation> & Pick<Observation, 'timeSeriesId' | 'parameterCode' | 'value'>): Observation {
  return {
    monitoringLocationId: 'USGS-01435000',
    statisticId: '00011',
    time: '2026-10-15T15:15:00Z',
    unit: 'ft^3/s',
    approvalStatus: 'Provisional',
    qualifier: null,
    ...partial,
  }
}

test('channel water temperature wins over a piezometer', () => {
  const chosen = chooseSeries([
    series({ id: 'piezo', parameterCode: '00010', sublocation: 'Piezometer 5 WQ' }),
    series({ id: 'channel', parameterCode: '00010', sublocation: 'Channel WQ' }),
  ], 'USGS-01435000', '00010')
  assert.equal(chosen?.id, 'channel')
})

test('a current series wins over one that ended last year', () => {
  const chosen = chooseSeries([
    series({ id: 'old', parameterCode: '00010', endUtc: '2025-11-24T16:00:00Z' }),
    series({ id: 'live', parameterCode: '00010', webDescription: 'Mid-channel', endUtc: '2026-10-15T10:15:00Z' }),
  ], 'USGS-01435000', '00010')
  assert.equal(chosen?.id, 'live')
})

test('two plain series with no way to choose stay blank', () => {
  const chosen = chooseSeries([
    series({ id: 'a', parameterCode: '00060' }),
    series({ id: 'b', parameterCode: '00060' }),
  ], 'USGS-01435000', '00060')
  assert.equal(chosen, null)
})

test('assemble keeps measured fields and leaves the rest blank', () => {
  const views = assembleGauges({
    now: NOW,
    gauges: [
      { site: '01435000', region: 'Catskills' },
      { site: '01315500', region: 'Adirondacks' },
    ],
    locations: [
      { site: '01435000', name: 'NEVERSINK RIVER NEAR CLARYVILLE NY', county: 'Sullivan County', state: 'New York', lat: 41.89, lon: -74.59 },
      { site: '01315500', name: 'HUDSON RIVER AT NORTH CREEK NY', county: 'Warren County', state: 'New York', lat: 43.7, lon: -73.98 },
    ],
    series: [
      series({ id: 'flow', parameterCode: '00060' }),
      series({ id: 'height', parameterCode: '00065' }),
      series({ id: 'temp', parameterCode: '00010', sublocation: 'Channel WQ' }),
      series({ id: 'piezo', parameterCode: '00010', sublocation: 'Piezometer 1' }),
      series({ id: 'hudson-flow', monitoringLocationId: 'USGS-01315500', parameterCode: '00060' }),
    ],
    latest: [
      observation({ timeSeriesId: 'flow', parameterCode: '00060', value: '133' }),
      observation({ timeSeriesId: 'height', parameterCode: '00065', value: '6.82', unit: 'ft' }),
      observation({ timeSeriesId: 'temp', parameterCode: '00010', value: '11.7', unit: 'degC' }),
      observation({ timeSeriesId: 'piezo', parameterCode: '00010', value: '9.2', unit: 'degC' }),
      observation({ timeSeriesId: 'estimated', parameterCode: '00010', value: '8.0', unit: 'degC', qualifier: ['Estimated'] }),
      observation({
        timeSeriesId: 'hudson-flow',
        monitoringLocationId: 'USGS-01315500',
        parameterCode: '00060',
        value: '4090',
        time: '2025-03-17T09:30:00Z',
      }),
    ],
    priors: [
      observation({ timeSeriesId: 'flow', parameterCode: '00060', value: '141', time: '2026-10-14T15:00:00Z' }),
    ],
  })

  assert.equal(views.length, 2)
  const neversink = views.find((view) => view.site === '01435000')
  assert.ok(neversink)
  assert.equal(neversink.flow, '133')
  assert.equal(neversink.trend, '-8')
  assert.equal(neversink.height, '6.82 ft')
  assert.equal(neversink.temp, '53.1 °F (11.7 °C)')
  assert.equal(neversink.tempState, 'value')
  assert.equal(neversink.status, 'Provisional')

  const hudson = views.find((view) => view.site === '01315500')
  assert.ok(hudson)
  assert.equal(hudson.flow, null)
  assert.equal(hudson.flowState, 'no-reading')
  assert.equal(hudson.tempState, 'not-measured')
  assert.equal(hudson.trend, null)
})

test('a discontinued temperature is not shown', () => {
  const views = assembleGauges({
    now: NOW,
    gauges: [{ site: '01362200', region: 'Catskills' }],
    locations: [{ site: '01362200', name: 'ESOPUS CREEK AT ALLABEN NY', county: 'Ulster County', state: 'New York', lat: 42.1, lon: -74.3 }],
    series: [series({ id: 'temp', monitoringLocationId: 'USGS-01362200', parameterCode: '00010' })],
    latest: [observation({
      timeSeriesId: 'temp',
      monitoringLocationId: 'USGS-01362200',
      parameterCode: '00010',
      value: null,
      unit: 'degC',
      qualifier: ['DISCONTINUED'],
    })],
    priors: [],
  })
  assert.equal(views[0].temp, null)
  assert.equal(views[0].tempState, 'no-reading')
})

test('flow trend ignores a prior reading that is not about 24 hours back', () => {
  const views = assembleGauges({
    now: NOW,
    gauges: [{ site: '01435000', region: 'Catskills' }],
    locations: [{ site: '01435000', name: 'NEVERSINK RIVER NEAR CLARYVILLE NY', county: null, state: null, lat: null, lon: null }],
    series: [series({ id: 'flow', parameterCode: '00060' })],
    latest: [observation({ timeSeriesId: 'flow', parameterCode: '00060', value: '133' })],
    priors: [observation({ timeSeriesId: 'flow', parameterCode: '00060', value: '90', time: '2026-10-14T02:00:00Z' })],
  })
  assert.equal(views[0].trend, null)
})

test('age and eastern clock come from the observation time', () => {
  assert.equal(formatAge('2026-10-15T14:30:00Z', NOW), '1h 30m ago')
  assert.equal(formatAge('2026-10-15T15:21:00Z', NOW), '39m ago')
  assert.equal(formatFlowDelta(0), '0')
  assert.equal(formatFlowDelta(5.3), '+5.3')
  const clock = formatEastern('2026-10-15T15:15:00Z')
  assert.ok(clock)
  assert.match(clock, /11:15/)
  assert.match(clock, /EDT/)
})
