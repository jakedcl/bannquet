import { unstable_cache } from 'next/cache'
import { extractText, getDocumentProxy } from 'unpdf'
import { MOUNTAIN_NY_COUNTIES } from '@/lib/fishing/gauges'
import { parseMaineStocking, type MaineStockingReport } from '@/lib/fishing/maine-stocking'

export type PlannedStocking = {
  year: string | null
  county: string | null
  town: string | null
  waterbody: string
  window: string | null
  number: string | null
  species: string | null
  size: string | null
}

export type PlannedStockingLoad = {
  rows: PlannedStocking[]
  truncated: boolean
}

const PLANNED_LIMIT = 2000
const MAINE_PDF = 'https://www.maine.gov/ifw/docs/current_stocking_report.pdf'

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function fetchPlannedStocking(): Promise<PlannedStockingLoad> {
  const counties = MOUNTAIN_NY_COUNTIES.map((county) => `'${county.toUpperCase()}'`).join(',')
  const url = new URL('https://data.ny.gov/resource/d9y2-n436.json')
  url.searchParams.set('$select', 'year,county,town,waterbody,date,number,species_name,size_inches')
  url.searchParams.set('$where', `upper(county) in(${counties})`)
  url.searchParams.set('$limit', String(PLANNED_LIMIT))
  url.searchParams.set('$order', 'county,waterbody,species_name')
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`NY planned stocking returned ${response.status}`)
  const body = (await response.json()) as unknown
  if (!Array.isArray(body)) throw new Error('NY planned stocking did not return a list')

  const rows: PlannedStocking[] = []
  for (const row of body) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const waterbody = text(record.waterbody)
    if (!waterbody) continue
    rows.push({
      year: text(record.year),
      county: text(record.county),
      town: text(record.town),
      waterbody,
      window: text(record.date),
      number: text(record.number),
      species: text(record.species_name),
      size: text(record.size_inches),
    })
  }
  return { rows, truncated: body.length >= PLANNED_LIMIT }
}

async function fetchMaineStocking(): Promise<MaineStockingReport> {
  const response = await fetch(MAINE_PDF, {
    headers: { 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Maine stocking PDF returned ${response.status}`)
  const pdf = await getDocumentProxy(new Uint8Array(await response.arrayBuffer()))
  const extracted = await extractText(pdf, { mergePages: true })
  const report = parseMaineStocking(extracted.text)
  if (report.rows.length === 0) {
    throw new Error('The Maine stocking PDF did not include any rows this page could read')
  }
  return report
}

export const loadPlannedStocking = unstable_cache(fetchPlannedStocking, ['fishing-ny-planned-v1'], { revalidate: 86400 })

export const loadMaineStocking = unstable_cache(fetchMaineStocking, ['fishing-me-stocking-v1'], { revalidate: 21600 })
