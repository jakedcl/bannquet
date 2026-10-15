import { unstable_cache } from 'next/cache'
import { MOUNTAIN_GAUGES } from '@/lib/fishing/gauges'
import {
  assembleGauges,
  type GaugeView,
  type LocationRecord,
  type Observation,
  type SeriesMeta,
} from '@/lib/fishing/readings'

const BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections'
const USER_AGENT = 'Bannquet (admin@bannquet.com)'

type Feature = {
  properties?: Record<string, unknown>
  geometry?: { type?: string; coordinates?: unknown }
}

export function waterDataKey(): string | null {
  const key = process.env.USGS_WATER_DATA_API_KEY || process.env.WATER_DATA_API_KEY
  if (!key) return null
  const trimmed = key.trim()
  return trimmed.length > 0 ? trimmed : null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function usgsItems(collection: string, params: Record<string, string>): Promise<Feature[]> {
  const features: Feature[] = []
  const limit = 1000
  for (let page = 0; page < 6; page += 1) {
    const url = new URL(`${BASE}/${collection}/items`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    url.searchParams.set('f', 'json')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(page * limit))
    const apiKey = waterDataKey()
    if (apiKey) url.searchParams.set('api_key', apiKey)
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT }
    if (apiKey) headers['X-Api-Key'] = apiKey
    const response = await fetch(url, { headers, cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`USGS ${collection} returned ${response.status}`)
    }
    const body = (await response.json()) as { features?: unknown; description?: unknown }
    if (!Array.isArray(body.features)) {
      const detail = typeof body.description === 'string' ? body.description : 'no feature list'
      throw new Error(`USGS ${collection} did not return readings (${detail})`)
    }
    features.push(...(body.features as Feature[]))
    if (body.features.length < limit) return features
  }
  throw new Error(`USGS ${collection} returned more pages than this page will read`)
}

function locationFromFeature(feature: Feature): LocationRecord | null {
  const properties = feature.properties ?? {}
  const site = stringValue(properties.monitoring_location_number)
  const name = stringValue(properties.monitoring_location_name)
  if (!site || !name) return null
  const coordinates = feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)
    ? feature.geometry.coordinates
    : null
  const lon = coordinates && typeof coordinates[0] === 'number' ? coordinates[0] : null
  const lat = coordinates && typeof coordinates[1] === 'number' ? coordinates[1] : null
  return {
    site,
    name,
    county: stringValue(properties.county_name),
    state: stringValue(properties.state_name),
    lat,
    lon,
  }
}

function seriesFromFeature(feature: Feature): SeriesMeta | null {
  const properties = feature.properties ?? {}
  const id = stringValue(properties.id)
  const monitoringLocationId = stringValue(properties.monitoring_location_id)
  const parameterCode = stringValue(properties.parameter_code)
  if (!id || !monitoringLocationId || !parameterCode) return null
  return {
    id,
    monitoringLocationId,
    parameterCode,
    statisticId: stringValue(properties.statistic_id),
    primary: stringValue(properties.primary),
    webDescription: stringValue(properties.web_description),
    sublocation: stringValue(properties.sublocation_identifier),
    endUtc: stringValue(properties.end_utc),
  }
}

function observationFromFeature(feature: Feature): Observation | null {
  const properties = feature.properties ?? {}
  const timeSeriesId = stringValue(properties.time_series_id)
  const monitoringLocationId = stringValue(properties.monitoring_location_id)
  const parameterCode = stringValue(properties.parameter_code)
  const time = stringValue(properties.time)
  if (!timeSeriesId || !monitoringLocationId || !parameterCode || !time) return null
  const rawValue = properties.value
  return {
    timeSeriesId,
    monitoringLocationId,
    parameterCode,
    statisticId: stringValue(properties.statistic_id),
    time,
    value: typeof rawValue === 'string' ? rawValue : typeof rawValue === 'number' && Number.isFinite(rawValue) ? String(rawValue) : null,
    unit: stringValue(properties.unit_of_measure),
    approvalStatus: stringValue(properties.approval_status),
    qualifier: properties.qualifier ?? null,
  }
}

function quoted(values: string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(',')
}

async function fetchGaugeSource(now: number): Promise<GaugeView[]> {
  const sites = MOUNTAIN_GAUGES.map((gauge) => gauge.site)
  const locationIds = sites.map((site) => `USGS-${site}`)
  const locationFilter = `agency_code='USGS' AND monitoring_location_number IN (${quoted(sites)})`
  const seriesFilter = `monitoring_location_id IN (${quoted(locationIds)}) AND statistic_id='00011' AND parameter_code IN ('00010','00060','00065')`
  const latestParams = {
    monitoring_location_id: locationIds.join(','),
    parameter_code: '00060,00065,00010',
    statistic_id: '00011',
  }

  const [locationFeatures, seriesFeatures, latestFeatures] = await Promise.all([
    usgsItems('monitoring-locations', { filter: locationFilter }),
    usgsItems('time-series-metadata', { filter: seriesFilter }),
    usgsItems('latest-continuous', latestParams),
  ])

  const end = new Date(now - 21 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const start = new Date(now - 27 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const priorFeatures = await usgsItems('continuous', {
    monitoring_location_id: locationIds.join(','),
    parameter_code: '00060',
    statistic_id: '00011',
    datetime: `${start}/${end}`,
  })

  const gauges = assembleGauges({
    gauges: MOUNTAIN_GAUGES,
    locations: locationFeatures.flatMap((feature) => {
      const location = locationFromFeature(feature)
      return location ? [location] : []
    }),
    series: seriesFeatures.flatMap((feature) => {
      const row = seriesFromFeature(feature)
      return row ? [row] : []
    }),
    latest: latestFeatures.flatMap((feature) => {
      const row = observationFromFeature(feature)
      return row ? [row] : []
    }),
    priors: priorFeatures.flatMap((feature) => {
      const row = observationFromFeature(feature)
      return row ? [row] : []
    }),
    now,
  })
  if (gauges.length === 0) throw new Error('USGS returned none of the mountain gauges')
  return gauges
}

const cachedGaugeSource = unstable_cache(
  async () => fetchGaugeSource(Date.now()),
  ['fishing-mountain-gauges-v1'],
  { revalidate: 900 },
)

export async function loadMountainGauges(): Promise<GaugeView[]> {
  return cachedGaugeSource()
}
