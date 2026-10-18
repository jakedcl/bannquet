import type { FreshwaterState } from '@/lib/fishing/freshwater-states'
import { plainWaterName } from '@/lib/fishing/readings'

/** River green, lake blue, stocking orange. Parking stays brown on the map. */
export const WATER_PIN_COLOR = {
  River: '#1e4d2b',
  Lake: '#1f4e9c',
  Stocking: '#e67e22',
  parking: '#8a5a2a',
} as const

export type WaterPlace = {
  name: string
  county: string | null
  state: FreshwaterState | null
  lat: number
  lon: number
}

export function waterMatchKey(name: string): string {
  return plainWaterName(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

export function countyMatchKey(county: string | null | undefined): string | null {
  if (!county) return null
  const key = county.toLowerCase().replace(/\bcounty\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
  return key || null
}

export function indexWaterPlaces(places: readonly WaterPlace[]): Map<string, WaterPlace[]> {
  const index = new Map<string, WaterPlace[]>()
  for (const place of places) {
    const key = waterMatchKey(place.name)
    if (!key || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) continue
    const bucket = index.get(key)
    if (bucket) bucket.push(place)
    else index.set(key, [place])
  }
  return index
}

/**
 * Point for a water that has no coordinates of its own.
 * The name must match one catalog water in the same state. When both sides
 * name a county, those counties must match too. Two different points is no match.
 */
export function locateWater(
  name: string,
  county: string | null,
  state: FreshwaterState | null,
  index: ReadonlyMap<string, readonly WaterPlace[]>,
): { lat: number; lon: number } | null {
  const key = waterMatchKey(name)
  if (!key) return null
  const bucket = index.get(key)
  if (!bucket) return null
  const wantedCounty = countyMatchKey(county)
  const matches = bucket.filter((place) => {
    if (state && place.state !== state) return false
    const placeCounty = countyMatchKey(place.county)
    if (wantedCounty && placeCounty && wantedCounty !== placeCounty) return false
    return true
  })
  const byCoord = new Map<string, { lat: number; lon: number }>()
  for (const place of matches) {
    byCoord.set(`${place.lat.toFixed(4)},${place.lon.toFixed(4)}`, { lat: place.lat, lon: place.lon })
  }
  if (byCoord.size !== 1) return null
  return byCoord.values().next().value ?? null
}
