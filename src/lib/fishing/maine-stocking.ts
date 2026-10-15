const SPECIES = ['RAINBOW TROUT', 'BROOK TROUT', 'BROWN TROUT', 'LAKE TROUT', 'LANDLOCKED SALMON', 'L.L. SALMON', 'SPLAKE']

const ROW = /^(.*?)(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)\s+(\d+)\s+(\d+(?:\.\d+)?)$/
const COUNTY = /^County([A-Za-z]+)$/
const NOTICE = /(\d{1,2}\/\d{1,2}\/\d{4})Preliminary Stocking Receipt Data/

export type MaineStockingRow = {
  date: string
  county: string
  water: string
  town: string
  species: string
  quantity: string
  sizeInches: string
}

export type MaineStockingReport = {
  preliminary: boolean
  asOf: string | null
  rows: MaineStockingRow[]
  skipped: number
}

export function parseMaineStocking(text: string): MaineStockingReport {
  const asOf = text.match(NOTICE)?.[1] ?? null
  const rows: MaineStockingRow[] = []
  let county = ''
  let skipped = 0

  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const countyName = trimmed.match(COUNTY)?.[1]
    if (countyName) {
      county = countyName
      continue
    }
    if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed) || /Preliminary Stocking Receipt/.test(trimmed)) continue
    const match = trimmed.match(ROW)
    const species = match ? SPECIES.find((name) => match[1].trimEnd().endsWith(name)) : undefined
    if (!match || !species || !county) {
      skipped += 1
      continue
    }
    const water = match[1].slice(0, match[1].length - species.length).trim()
    const town = match[3].trim()
    if (!water || !town) {
      skipped += 1
      continue
    }
    rows.push({
      date: match[2],
      county,
      water,
      town,
      species,
      quantity: match[4],
      sizeInches: match[5],
    })
  }

  return {
    preliminary: asOf != null || /Preliminary Stocking Receipt Data/i.test(text),
    asOf,
    rows,
    skipped,
  }
}

export function stockingDateKey(date: string): number {
  const match = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return 0
  return Number(match[3]) * 10000 + Number(match[1]) * 100 + Number(match[2])
}
