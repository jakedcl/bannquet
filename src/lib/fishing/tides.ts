import { unstable_cache } from 'next/cache'
import { compactDate, zonedStamp } from '@/lib/fishing/clock'

const APPLICATION = 'bannquet'

export type TideExtreme = {
  time: number
  feet: number
  kind: 'H' | 'L'
}

export type TidePoint = {
  time: number
  feet: number
}

export type TideSet = {
  extremes: TideExtreme[]
  curve: TidePoint[]
}

type Prediction = {
  t?: string
  v?: string
  type?: string
}

function feet(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const STAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/

export function parseExtremes(rows: Prediction[]): TideExtreme[] {
  return rows.flatMap((row) => {
    if (!row.t || !STAMP.test(row.t) || (row.type !== 'H' && row.type !== 'L')) return []
    const height = feet(row.v)
    if (height == null) return []
    return [{ time: zonedStamp(row.t), feet: height, kind: row.type }]
  })
}

export function parseCurve(rows: Prediction[]): TidePoint[] {
  return rows.flatMap((row) => {
    if (!row.t || !STAMP.test(row.t)) return []
    const height = feet(row.v)
    if (height == null) return []
    return [{ time: zonedStamp(row.t), feet: height }]
  })
}

export function nextExtreme(extremes: TideExtreme[], now: number): TideExtreme | null {
  return extremes.find((extreme) => extreme.time > now) ?? null
}

async function predictions(stationId: string, begin: string, end: string, interval: string): Promise<Prediction[]> {
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
  url.searchParams.set('begin_date', compactDate(begin))
  url.searchParams.set('end_date', compactDate(end))
  url.searchParams.set('station', stationId)
  url.searchParams.set('product', 'predictions')
  url.searchParams.set('datum', 'MLLW')
  url.searchParams.set('time_zone', 'lst_ldt')
  url.searchParams.set('interval', interval)
  url.searchParams.set('units', 'english')
  url.searchParams.set('format', 'json')
  url.searchParams.set('application', APPLICATION)
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NOAA tides returned ${response.status}`)
  const body = (await response.json()) as { predictions?: unknown; error?: { message?: string } }
  if (!Array.isArray(body.predictions)) {
    console.error('NOAA tides missing predictions', stationId, body.error?.message ?? 'no list')
    throw new Error('Data unavailable')
  }
  return body.predictions as Prediction[]
}

async function readTides(stationId: string, begin: string, end: string): Promise<TideSet> {
  const [extremes, curve] = await Promise.all([
    predictions(stationId, begin, end, 'hilo'),
    predictions(stationId, begin, end, '30'),
  ])
  return { extremes: parseExtremes(extremes), curve: parseCurve(curve) }
}

export const loadTides = unstable_cache(readTides, ['noaa-tide-predictions-v1'], { revalidate: 3600 })
