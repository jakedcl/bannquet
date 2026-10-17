import { unstable_cache } from 'next/cache'
import { nearestSensor, type SensorStation } from '@/lib/fishing/tide-stations'

const USER_AGENT = 'Bannquet (admin@bannquet.com)'

export type WaterReading = {
  fahrenheit: number
  at: string
  stationName: string
}

export type WindReading = {
  text: string
  at: string
  stationName: string
}

export type MarinePeriod = {
  name: string
  text: string
}

export type MarineForecast = {
  zoneId: string
  zoneName: string
  periods: MarinePeriod[]
  alerts: { event: string; headline: string }[]
}

type Observation = {
  t?: string
  v?: string
  s?: string
  d?: string
  dr?: string
  g?: string
}

async function coopsLatest(stationId: string, product: string): Promise<{ name: string; rows: Observation[] } | null> {
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
  url.searchParams.set('date', 'latest')
  url.searchParams.set('station', stationId)
  url.searchParams.set('product', product)
  url.searchParams.set('units', 'english')
  url.searchParams.set('time_zone', 'lst_ldt')
  url.searchParams.set('format', 'json')
  url.searchParams.set('application', 'bannquet')
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NOAA ${product} returned ${response.status}`)
  const body = (await response.json()) as {
    metadata?: { name?: string }
    data?: Observation[]
    error?: { message?: string }
  }
  if (!Array.isArray(body.data) || body.data.length === 0) return null
  return { name: body.metadata?.name || stationId, rows: body.data }
}

function round(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

async function readWater(lat: number, lon: number): Promise<WaterReading | null> {
  for (const sensor of nearestSensor(lat, lon)) {
    const latest = await coopsLatest(sensor.id, 'water_temperature')
    const row = latest?.rows.at(-1)
    const fahrenheit = row ? Number(row.v) : Number.NaN
    if (!row?.t || !Number.isFinite(fahrenheit)) continue
    return { fahrenheit, at: row.t, stationName: sensor.name }
  }
  return null
}

function windText(row: Observation): string | null {
  const speed = round(row.s)
  if (speed == null) return null
  const gust = round(row.g)
  const direction = row.dr?.trim()
  const head = direction ? `${direction} ${speed}` : String(speed)
  return gust != null && gust > speed ? `${head} mph, gust ${gust}` : `${head} mph`
}

async function readWind(lat: number, lon: number): Promise<WindReading | null> {
  for (const sensor of nearestSensor(lat, lon)) {
    const latest = await coopsLatest(sensor.id, 'wind')
    const row = latest?.rows.at(-1)
    const text = row ? windText(row) : null
    if (!row?.t || !text) continue
    return { text, at: row.t, stationName: sensor.name }
  }
  return null
}

async function nws<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Bannquet-Weather-App (admin@bannquet.com)',
      Accept: 'application/geo+json',
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NWS returned ${response.status}`)
  return response.json() as Promise<T>
}

export function pickMarineZone(urls: (string | null | undefined)[]): string | null {
  for (const url of urls) {
    const id = url?.split('/').pop() ?? ''
    if (id.startsWith('ANZ')) return url ?? null
  }
  return null
}

async function forecastZoneAt(lat: number, lon: number): Promise<string | null> {
  const point = await nws<{ properties?: { forecastZone?: string } }>(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
  )
  return point.properties?.forecastZone ?? null
}

async function marineZoneUrl(lat: number, lon: number): Promise<string> {
  const direct = await forecastZoneAt(lat, lon)
  const exact = pickMarineZone([direct])
  if (exact) return exact
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const step of [0.04, 0.08]) {
    const nearby = await Promise.all(directions.map(async ([north, east]) => {
      try {
        return await forecastZoneAt(lat + north * step, lon + east * step)
      } catch {
        return null
      }
    }))
    const marine = pickMarineZone(nearby)
    if (marine) return marine
  }
  throw new Error('NWS point had no marine zone')
}

async function readMarine(lat: number, lon: number): Promise<MarineForecast> {
  const zoneUrl = await marineZoneUrl(lat, lon)
  const [zone, forecast, alerts] = await Promise.all([
    nws<{ properties?: { id?: string; name?: string } }>(zoneUrl),
    nws<{ properties?: { periods?: { name?: string; detailedForecast?: string }[] } }>(`${zoneUrl}/forecast`),
    nws<{ features?: { properties?: { event?: string; headline?: string } }[] }>(
      `https://api.weather.gov/alerts/active?zone=${zoneUrl.split('/').pop()}`,
    ).catch(() => ({ features: [] })),
  ])
  const periods = (forecast.properties?.periods ?? []).flatMap((period) => {
    const name = period.name?.trim()
    const text = period.detailedForecast?.trim()
    if (!name || !text) return []
    return [{ name, text }]
  }).slice(0, 6)
  const headlines = (alerts.features ?? []).flatMap((feature) => {
    const event = feature.properties?.event?.trim()
    if (!event) return []
    return [{ event, headline: feature.properties?.headline?.trim() || event }]
  })
  return {
    zoneId: zone.properties?.id || zoneUrl.split('/').pop() || 'zone',
    zoneName: zone.properties?.name || 'Marine zone',
    periods,
    alerts: headlines,
  }
}

export const loadWater = unstable_cache(readWater, ['noaa-water-temp-v1'], { revalidate: 900 })
export const loadWind = unstable_cache(readWind, ['noaa-wind-v1'], { revalidate: 900 })
export const loadMarine = unstable_cache(readMarine, ['nws-marine-zone-v2'], { revalidate: 900 })

export function sensorOrder(lat: number, lon: number): string[] {
  return nearestSensor(lat, lon).map((sensor: SensorStation) => sensor.id)
}
