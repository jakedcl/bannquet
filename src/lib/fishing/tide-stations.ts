/**
 * Staten Island tide stations from the CO-OPS metadata API
 * (api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions),
 * checked 2026-10-17. Predictions were confirmed on the datagetter for each id.
 * Water temperature and wind are not on the subordinate stations. The Battery
 * and Sandy Hook are the nearby CO-OPS stations that reported both that day.
 */
export type TideStation = {
  id: string
  slug: string
  label: string
  officialName: string
  lat: number
  lon: number
}

export type SensorStation = {
  id: string
  name: string
  lat: number
  lon: number
}

export const TIDE_STATIONS: TideStation[] = [
  { id: '8519436', slug: 'great-kills', label: 'Great Kills', officialName: 'Great Kills Harbor', lat: 40.5433, lon: -74.14 },
  { id: '8519112', slug: 'st-george', label: 'St. George', officialName: 'St. George, Staten Island', lat: 40.6433, lon: -74.0733 },
  { id: '8519483', slug: 'bergen-point', label: 'Bergen Point', officialName: 'Bergen Point West Reach', lat: 40.63911, lon: -74.14631 },
  { id: '8519726', slug: 'princes-bay', label: 'Princes Bay', officialName: 'Princes Bay', lat: 40.5117, lon: -74.2 },
  { id: '8531680', slug: 'sandy-hook', label: 'Sandy Hook', officialName: 'Sandy Hook, Fort Hancock', lat: 40.4669, lon: -74.0094 },
]

export const DEFAULT_TIDE_STATION = TIDE_STATIONS[0]

export const WATER_SENSORS: SensorStation[] = [
  { id: '8531680', name: 'Sandy Hook', lat: 40.4669, lon: -74.0094 },
  { id: '8518750', name: 'The Battery', lat: 40.7006, lon: -74.0142 },
]

export function tideStation(slug: string | undefined): TideStation {
  return TIDE_STATIONS.find((station) => station.slug === slug) ?? DEFAULT_TIDE_STATION
}

export function nearestSensor(lat: number, lon: number): SensorStation[] {
  return [...WATER_SENSORS].sort((a, b) => distance(lat, lon, a) - distance(lat, lon, b))
}

function distance(lat: number, lon: number, sensor: SensorStation): number {
  const dLat = lat - sensor.lat
  const dLon = lon - sensor.lon
  return dLat * dLat + dLon * dLon
}
