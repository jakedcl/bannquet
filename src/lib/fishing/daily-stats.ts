import { unstable_cache } from 'next/cache'
import { easternDate } from '@/lib/fishing/clock'

export function easternMonthDay(time: number): { month: number; day: number } {
  const [, month, day] = easternDate(time).split('-').map(Number)
  return { month, day }
}

export function parseDailyMedians(body: string, month: number, day: number): Record<string, number> {
  const lines = body.split(/\r?\n/)
  const header = lines.findIndex((line) => line.startsWith('agency_cd\t'))
  if (header < 0) return {}
  const columns = lines[header].split('\t')
  const site = columns.indexOf('site_no')
  const monthCol = columns.indexOf('month_nu')
  const dayCol = columns.indexOf('day_nu')
  const median = columns.indexOf('p50_va')
  if (site < 0 || monthCol < 0 || dayCol < 0 || median < 0) return {}
  const found: Record<string, number> = {}
  for (const line of lines.slice(header + 2)) {
    if (!line || line.startsWith('#')) continue
    const cells = line.split('\t')
    if (Number(cells[monthCol]) !== month || Number(cells[dayCol]) !== day) continue
    const raw = cells[median]?.trim()
    const value = raw ? Number(raw) : Number.NaN
    const id = cells[site]?.trim()
    if (!id || !Number.isFinite(value)) continue
    found[id] = value
  }
  return found
}

async function readDailyMedians(sites: string[], month: number, day: number): Promise<Record<string, number>> {
  if (sites.length === 0) return {}
  const url = new URL('https://waterservices.usgs.gov/nwis/stat/')
  url.searchParams.set('sites', sites.join(','))
  url.searchParams.set('parameterCd', '00060')
  url.searchParams.set('statReportType', 'daily')
  url.searchParams.set('statTypeCd', 'median')
  url.searchParams.set('format', 'rdb')
  const response = await fetch(url, {
    headers: { Accept: 'text/plain', 'User-Agent': 'Bannquet (admin@bannquet.com)' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`USGS daily statistics returned ${response.status}`)
  return parseDailyMedians(await response.text(), month, day)
}

export const loadDailyMedians = unstable_cache(readDailyMedians, ['usgs-daily-median-v1'], { revalidate: 3600 })
