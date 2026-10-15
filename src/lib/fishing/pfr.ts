import { unstable_cache } from 'next/cache'
import { MOUNTAIN_NY_COUNTIES } from '@/lib/fishing/gauges'

export type ParkingArea = {
  id: string
  water: string
  town: string | null
  county: string | null
  road: string | null
  parkingNumber: string | null
  stocked: string | null
  troutPresent: string | null
  lat: number | null
  lon: number | null
  mapHref: string | null
  rulesHref: string | null
}

export type ParkingLoad = {
  areas: ParkingArea[]
  truncated: boolean
}

const LIMIT = 1000

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function httpUrl(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function coordinate(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchParking(): Promise<ParkingLoad> {
  const counties = MOUNTAIN_NY_COUNTIES.map((county) => `'${county.toUpperCase()}'`).join(',')
  const url = new URL('https://data.ny.gov/resource/9vef-6whi.json')
  url.searchParams.set(
    '$select',
    'water,town,county,road,parking_area_number,stocked_trout,trout_present,latitude,longitude,pdf_map_link,special_regulations_link',
  )
  url.searchParams.set('$where', `upper(county) in(${counties})`)
  url.searchParams.set('$limit', String(LIMIT))
  url.searchParams.set('$order', 'county,water,town')
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NY public fishing rights parking returned ${response.status}`)
  const body = (await response.json()) as unknown
  if (!Array.isArray(body)) throw new Error('NY public fishing rights parking did not return a list')

  const areas: ParkingArea[] = []
  body.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    const record = row as Record<string, unknown>
    const water = text(record.water)
    if (!water) return
    const lat = coordinate(record.latitude)
    const lon = coordinate(record.longitude)
    const county = text(record.county)
    const town = text(record.town)
    const parkingNumber = text(record.parking_area_number) ?? (typeof record.parking_area_number === 'number' ? String(record.parking_area_number) : null)
    areas.push({
      id: `${county ?? 'county'}-${water}-${town ?? 'town'}-${parkingNumber ?? index}-${lat ?? 'lat'}`,
      water,
      town,
      county,
      road: text(record.road),
      parkingNumber,
      stocked: text(record.stocked_trout),
      troutPresent: text(record.trout_present),
      lat,
      lon,
      mapHref: httpUrl(record.pdf_map_link),
      rulesHref: httpUrl(record.special_regulations_link),
    })
  })

  return { areas, truncated: body.length >= LIMIT }
}

export const loadParkingAreas = unstable_cache(fetchParking, ['fishing-ny-pfr-v1'], { revalidate: 86400 })
