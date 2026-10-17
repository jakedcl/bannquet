import { TIDE_STATIONS, type TideStation } from '@/lib/fishing/tide-stations'

export type ShoreSpot = {
  slug: string
  name: string
  waterId: string
  lat: number
  lon: number
  access: string
}

/**
 * Public Staten Island shore access. Coordinates are OpenStreetMap places
 * retrieved 2026-10-17. The tide station is the nearest of the five CO-OPS
 * stations, computed rather than typed in.
 */
export const SHORE_SPOTS: ShoreSpot[] = [
  { slug: 'great-kills', name: 'Great Kills Park', waterId: 'lower-bay', lat: 40.5436508, lon: -74.1261469, access: 'NPS Gateway. Harbor and beach on Lower New York Bay.' },
  { slug: 'south-beach', name: 'South Beach / FDR Boardwalk', waterId: 'lower-bay', lat: 40.5862228, lon: -74.0691978, access: 'NYC Parks boardwalk at South Beach.' },
  { slug: 'midland-beach', name: 'Midland Beach', waterId: 'lower-bay', lat: 40.5731606, lon: -74.094586, access: 'NYC Parks beach and boardwalk.' },
  { slug: 'new-dorp', name: 'New Dorp Beach', waterId: 'lower-bay', lat: 40.564356, lon: -74.1048624, access: 'NYC Parks beach.' },
  { slug: 'cedar-grove', name: 'Cedar Grove Beach', waterId: 'lower-bay', lat: 40.5562663, lon: -74.1027449, access: 'NYC Parks beach.' },
  { slug: 'wolfes-pond', name: "Wolfe's Pond Park", waterId: 'raritan-west', lat: 40.5247505, lon: -74.1946167, access: 'NYC Parks. DOH splits Raritan Bay advice at this park.' },
  { slug: 'lemon-creek', name: 'Lemon Creek Park', waterId: 'raritan-west', lat: 40.5140341, lon: -74.1986299, access: 'NYC Parks. Creek mouth on Raritan Bay.' },
  { slug: 'mount-loretto', name: 'Mount Loretto', waterId: 'raritan-west', lat: 40.5058334, lon: -74.2183758, access: 'NYS DEC Unique Area on Raritan Bay.' },
  { slug: 'conference-house', name: 'Conference House Park', waterId: 'raritan-west', lat: 40.5015451, lon: -74.2518302, access: 'NYC Parks shoreline at Tottenville.' },
  { slug: 'fort-wadsworth', name: 'Fort Wadsworth', waterId: 'lower-bay', lat: 40.6089933, lon: -74.0626409, access: 'NPS Gateway at the Narrows.' },
  { slug: 'alice-austen', name: 'Alice Austen Park', waterId: 'upper-bay', lat: 40.6154081, lon: -74.0629715, access: 'NYC Parks on the Upper Bay.' },
  { slug: 'st-george', name: 'St. George Esplanade', waterId: 'upper-bay', lat: 40.647715, lon: -74.0817455, access: 'NYC Parks esplanade on the Upper Bay.' },
  { slug: 'faber-park', name: 'Faber Park', waterId: 'kills', lat: 40.6411044, lon: -74.1357837, access: 'NYC Parks on the Kill Van Kull.' },
]

export function shoreSpot(slug: string): ShoreSpot | null {
  return SHORE_SPOTS.find((spot) => spot.slug === slug) ?? null
}

function miles(lat: number, lon: number, station: TideStation): number {
  const radius = 3958.8
  const dLat = ((station.lat - lat) * Math.PI) / 180
  const dLon = ((station.lon - lon) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat * Math.PI) / 180) * Math.cos((station.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(a))
}

export function nearestTideStation(spot: ShoreSpot): TideStation {
  return [...TIDE_STATIONS].sort((a, b) => miles(spot.lat, spot.lon, a) - miles(spot.lat, spot.lon, b))[0]
}
