import { unstable_cache } from 'next/cache'
import { outsideFetch } from '@/lib/outside-fetch'

export type FishingLake = {
  id: string
  name: string
  county: string | null
  acres: string | null
  species: string | null
  launch: string | null
  note: string | null
  lat: number | null
  lon: number | null
}

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function coordinate(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

async function readLakes(): Promise<FishingLake[]> {
  const url = new URL('https://data.ny.gov/resource/mw8j-wduf.json')
  url.searchParams.set('$select', 'water,county,acres_mile,fish_speci,boat_launc,comments,point_y,point_x')
  url.searchParams.set('$limit', '1000')
  url.searchParams.set('$order', 'county,water')
  const response = await outsideFetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NY fishing lakes returned ${response.status}`)
  const body = (await response.json()) as unknown
  if (!Array.isArray(body)) throw new Error('NY fishing lakes did not return a list')
  const lakes: FishingLake[] = []
  body.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    const record = row as Record<string, unknown>
    const name = text(record.water)
    if (!name) return
    const county = text(record.county)
    lakes.push({
      id: `${county ?? 'ny'}-${name}-${index}`,
      name,
      county,
      acres: text(record.acres_mile),
      species: text(record.fish_speci),
      launch: text(record.boat_launc),
      note: text(record.comments),
      lat: coordinate(record.point_y),
      lon: coordinate(record.point_x),
    })
  })
  return lakes
}

export const loadFishingLakes = unstable_cache(readLakes, ['ny-fishing-lakes-v1'], { revalidate: 3600 })
