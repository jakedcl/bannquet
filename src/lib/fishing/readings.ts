import { FISHING_REGIONS, type CuratedGauge, type FishingRegion } from '@/lib/fishing/gauges'

export const CURRENT_READING_MS = 48 * 60 * 60 * 1000
const SERIES_GAP_MS = 48 * 60 * 60 * 1000
const PRIOR_TARGET_MS = 24 * 60 * 60 * 1000
const PRIOR_TOLERANCE_MS = 3 * 60 * 60 * 1000
const SENSOR_NOISE = /piezometer|profiler|depth\s*\d|mixedsw/i
const CHANNEL = /channel/i

export type SeriesMeta = {
  id: string
  monitoringLocationId: string
  parameterCode: string
  statisticId: string | null
  primary: string | null
  webDescription: string | null
  sublocation: string | null
  endUtc: string | null
}

export type Observation = {
  timeSeriesId: string
  monitoringLocationId: string
  parameterCode: string
  statisticId: string | null
  time: string
  value: string | null
  unit: string | null
  approvalStatus: string | null
  qualifier: unknown
}

export type LocationRecord = {
  site: string
  name: string
  county: string | null
  state: string | null
  lat: number | null
  lon: number | null
}

export type FieldState = 'value' | 'not-measured' | 'no-reading'

export type GaugeView = {
  site: string
  name: string
  region: FishingRegion
  county: string | null
  state: string | null
  lat: number | null
  lon: number | null
  flow: string | null
  flowNote: string | null
  trend: string | null
  height: string | null
  heightNote: string | null
  temp: string | null
  tempNote: string | null
  flowState: FieldState
  heightState: FieldState
  tempState: FieldState
  updatedAt: string | null
  tempAt: string | null
  status: string | null
  usgsHref: string
}

export function parseGaugeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function qualifierList(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
}

export function qualifierBlocksValue(value: unknown): boolean {
  const text = qualifierList(value).join(' ').toLowerCase()
  return text.includes('estimat') || text.includes('discontinu') || text.includes('eqp')
}

export function isCubicFeetPerSecond(unit: string | null): boolean {
  if (!unit) return false
  const compact = unit.toLowerCase().replace(/\s/g, '')
  return compact === 'ft^3/s' || compact === 'ft3/s' || compact === 'cfs'
}

export function isCelsius(unit: string | null): boolean {
  if (!unit) return false
  const compact = unit.toLowerCase().replace(/\s/g, '')
  return compact === 'degc' || compact === '°c' || compact === 'c'
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32
}

export function isCurrentReading(iso: string, now: number): boolean {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return false
  const age = now - time
  return age >= 0 && age <= CURRENT_READING_MS
}

export function chooseSeries(rows: SeriesMeta[], locationId: string, parameterCode: string): SeriesMeta | null {
  let candidates = rows.filter((row) => {
    if (row.monitoringLocationId !== locationId || row.parameterCode !== parameterCode) return false
    if (row.statisticId !== '00011' || row.primary !== 'Primary') return false
    return !SENSOR_NOISE.test(`${row.webDescription ?? ''} ${row.sublocation ?? ''}`)
  })
  if (candidates.length === 0) return null

  const ends = candidates
    .map((row) => Date.parse(row.endUtc ?? ''))
    .filter((time) => Number.isFinite(time))
  if (ends.length > 0) {
    const newest = Math.max(...ends)
    const recent = candidates.filter((row) => {
      const end = Date.parse(row.endUtc ?? '')
      return Number.isFinite(end) && newest - end <= SERIES_GAP_MS
    })
    if (recent.length > 0) candidates = recent
  }

  if (candidates.length === 1) return candidates[0]
  const channel = candidates.filter((row) => CHANNEL.test(`${row.webDescription ?? ''} ${row.sublocation ?? ''}`))
  if (channel.length === 1) return channel[0]
  const plain = candidates.filter((row) => !row.webDescription && !row.sublocation)
  if (plain.length === 1) return plain[0]
  return null
}

export function formatFlowDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  const text = Object.is(rounded, -0) ? '0' : String(rounded)
  return rounded > 0 ? `+${text}` : text
}

export function formatAge(iso: string, now: number): string | null {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return null
  const minutes = Math.round((now - time) / 60000)
  if (minutes < 0 || minutes > 48 * 60) return null
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`
}

export function formatEastern(iso: string): string | null {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return null
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(time)
}

export function formatTemperature(value: string, unit: string | null): string | null {
  if (!isCelsius(unit)) return unit ? `${value} ${unit}` : null
  const celsius = parseGaugeNumber(value)
  if (celsius == null) return null
  const fahrenheit = celsiusToFahrenheit(celsius)
  return `${value} °C (${fahrenheit.toFixed(1)} °F)`
}

type Field = {
  state: FieldState
  text: string | null
  note: string | null
  time: string | null
  status: string | null
  number: number | null
  unit: string | null
  seriesId: string | null
}

function newestObservation(rows: Observation[]): Observation | null {
  let best: Observation | null = null
  let bestTime = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const time = Date.parse(row.time)
    if (!Number.isFinite(time) || time < bestTime) continue
    best = row
    bestTime = time
  }
  return best
}

function seriesIdFor(
  series: SeriesMeta[],
  latest: Observation[],
  locationId: string,
  parameterCode: string,
): string | null {
  const meta = series.filter((row) => row.monitoringLocationId === locationId && row.parameterCode === parameterCode)
  if (meta.length > 0) return chooseSeries(series, locationId, parameterCode)?.id ?? null
  const ids = [
    ...new Set(
      latest
        .filter((row) => row.monitoringLocationId === locationId && row.parameterCode === parameterCode && row.statisticId === '00011')
        .map((row) => row.timeSeriesId),
    ),
  ]
  return ids.length === 1 ? ids[0] : null
}

function readField(
  series: SeriesMeta[],
  latest: Observation[],
  locationId: string,
  parameterCode: string,
  now: number,
): Field {
  const seriesId = seriesIdFor(series, latest, locationId, parameterCode)
  if (!seriesId) {
    return { state: 'not-measured', text: null, note: null, time: null, status: null, number: null, unit: null, seriesId: null }
  }
  const observation = newestObservation(latest.filter((row) => row.timeSeriesId === seriesId))
  const empty: Field = { state: 'no-reading', text: null, note: null, time: null, status: null, number: null, unit: null, seriesId }
  if (!observation || qualifierBlocksValue(observation.qualifier) || !isCurrentReading(observation.time, now)) return empty
  const number = parseGaugeNumber(observation.value)
  const text = typeof observation.value === 'string' ? observation.value.trim() : null
  if (number == null || !text) return empty
  const notes = qualifierList(observation.qualifier)
  return {
    state: 'value',
    text,
    note: notes.length ? notes.join(', ') : null,
    time: observation.time,
    status: observation.approvalStatus,
    number,
    unit: observation.unit,
    seriesId,
  }
}

function priorValue(priors: Observation[], seriesId: string, latestIso: string): number | null {
  const latest = Date.parse(latestIso)
  if (!Number.isFinite(latest)) return null
  const target = latest - PRIOR_TARGET_MS
  let best: { value: number; distance: number } | null = null
  for (const row of priors) {
    if (row.timeSeriesId !== seriesId || qualifierBlocksValue(row.qualifier)) continue
    const time = Date.parse(row.time)
    const value = parseGaugeNumber(row.value)
    if (!Number.isFinite(time) || value == null || !isCubicFeetPerSecond(row.unit)) continue
    const distance = Math.abs(time - target)
    if (distance > PRIOR_TOLERANCE_MS) continue
    if (!best || distance < best.distance) best = { value, distance }
  }
  return best ? best.value : null
}

function statusLabel(fields: Field[]): string | null {
  const statuses = fields
    .filter((field) => field.state === 'value' && field.status)
    .map((field) => field.status as string)
  if (statuses.length === 0) return null
  if (statuses.some((status) => status.toLowerCase() === 'provisional')) return 'Provisional'
  const first = statuses[0]
  return statuses.every((status) => status === first) ? first : null
}

export function assembleGauges(input: {
  gauges: CuratedGauge[]
  locations: LocationRecord[]
  series: SeriesMeta[]
  latest: Observation[]
  priors: Observation[]
  now: number
}): GaugeView[] {
  const locations = new Map(input.locations.map((location) => [location.site, location]))
  const views: GaugeView[] = []

  for (const gauge of input.gauges) {
    const location = locations.get(gauge.site)
    if (!location?.name) continue
    const locationId = `USGS-${gauge.site}`
    const flow = readField(input.series, input.latest, locationId, '00060', input.now)
    const height = readField(input.series, input.latest, locationId, '00065', input.now)
    const temp = readField(input.series, input.latest, locationId, '00010', input.now)
    const flowText = flow.state === 'value' && flow.text
      ? (isCubicFeetPerSecond(flow.unit) ? flow.text : `${flow.text} ${flow.unit ?? ''}`.trim())
      : null
    let trend: string | null = null
    if (flow.state === 'value' && flow.seriesId && flow.time && flow.number != null && isCubicFeetPerSecond(flow.unit)) {
      const prior = priorValue(input.priors, flow.seriesId, flow.time)
      if (prior != null) trend = formatFlowDelta(flow.number - prior)
    }
    const tempText = temp.state === 'value' && temp.text ? formatTemperature(temp.text, temp.unit) : null
    const heightText = height.state === 'value' && height.text
      ? (height.unit ? `${height.text} ${height.unit}` : height.text)
      : null
    const times = [flow.time, height.time, temp.time].filter((time): time is string => Boolean(time))
    const updatedAt = times.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null

    views.push({
      site: gauge.site,
      name: location.name,
      region: gauge.region,
      county: location.county,
      state: location.state,
      lat: location.lat,
      lon: location.lon,
      flow: flowText,
      flowNote: flow.note,
      trend,
      height: heightText,
      heightNote: height.note,
      temp: tempText,
      tempNote: temp.note,
      flowState: flow.state,
      heightState: height.state,
      tempState: temp.state === 'value' && !tempText ? 'no-reading' : temp.state,
      updatedAt,
      tempAt: temp.time,
      status: statusLabel([flow, height, temp]),
      usgsHref: `https://waterdata.usgs.gov/monitoring-location/USGS-${gauge.site}/`,
    })
  }

  return views.sort((a, b) => {
    const region = FISHING_REGIONS.indexOf(a.region) - FISHING_REGIONS.indexOf(b.region)
    return region || a.name.localeCompare(b.name)
  })
}
