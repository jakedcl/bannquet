import {
  FRESHWATER_STATES,
  freshwaterStateCode,
  freshwaterStateLabel,
  LAKE_LINKS,
  STOCKING_LINKS,
  type FreshwaterState,
  type FreshwaterStateFilter,
  type FreshwaterTab,
  type OutboundLink,
} from '@/lib/fishing/freshwater-states'
import type { FishingLake } from '@/lib/fishing/lakes'
import type { MaineStockingRow } from '@/lib/fishing/maine-stocking'
import { parseGaugeNumber, plainWaterName, type FieldState, type GaugeView } from '@/lib/fishing/readings'
import type { ActualStocking } from '@/lib/fishing/stocking'
import { indexWaterPlaces, locateWater, type WaterPlace } from '@/lib/fishing/water-places'

export type FreshwaterKind = 'River' | 'Lake' | 'Stocking'
export type FreshwaterLayout = 'summary' | FreshwaterKind

export type FreshwaterRow = {
  id: string
  name: string
  stateLabel: string
  stateCode: FreshwaterState | null
  kind: FreshwaterKind
  /** Verdict, species, or last stocked date. Empty values render as a dash in the mixed list. */
  status: string | null
  href: string | null
  external: boolean
  usgsHref: string | null
  search: string
  site: string | null
  flow: string | null
  flowSort: number | null
  flowState: FieldState | null
  temp: string | null
  tempState: FieldState | null
  verdict: string | null
  county: string | null
  species: string | null
  launch: string | null
  when: string | null
  number: string | null
  numberSort: number | null
  lat: number | null
  lon: number | null
}

const EMPTY_FIELDS = {
  status: null,
  href: null,
  external: false,
  usgsHref: null,
  site: null,
  flow: null,
  flowSort: null,
  flowState: null,
  temp: null,
  tempState: null,
  verdict: null,
  county: null,
  species: null,
  launch: null,
  when: null,
  number: null,
  numberSort: null,
  lat: null,
  lon: null,
} satisfies Omit<FreshwaterRow, 'id' | 'name' | 'stateLabel' | 'stateCode' | 'kind' | 'search'>

/** All states or all types share one short table. One state and one type keep that type's columns. */
export function freshwaterLayout(state: FreshwaterStateFilter, tab: FreshwaterTab): FreshwaterLayout {
  if (state === 'all' || tab === 'all') return 'summary'
  if (tab === 'lakes') return 'Lake'
  if (tab === 'stocking') return 'Stocking'
  return 'River'
}

export type FreshwaterSources = {
  gauges: GaugeView[]
  lakes: FishingLake[]
  nyStocking: ActualStocking[]
  meStocking: MaineStockingRow[]
}

export type FreshwaterListing = {
  rows: FreshwaterRow[]
  sourceLinks: OutboundLink[]
  emptyLinks: OutboundLink[]
}

function statesIn(state: FreshwaterStateFilter): FreshwaterState[] {
  if (state === 'all') return FRESHWATER_STATES.map((item) => item.code)
  return [state]
}

function haystack(...parts: (string | null | undefined)[]): string {
  return parts.filter((part) => part && part.trim()).join(' ').toLowerCase()
}

function leadingNumber(value: string | null): number | null {
  if (!value) return null
  return parseGaugeNumber(value.split(' ')[0] ?? '')
}

function countNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function assembleFreshwaterRows(
  state: FreshwaterStateFilter,
  tab: FreshwaterTab,
  sources: FreshwaterSources,
): FreshwaterListing {
  const rows: FreshwaterRow[] = []
  const sourceLinks: OutboundLink[] = []
  const places = indexWaterPlaces(catalogPlaces(sources))
  const showRivers = tab === 'all' || tab === 'rivers'
  const showLakes = tab === 'all' || tab === 'lakes'
  const showStocking = tab === 'all' || tab === 'stocking'
  const nyLakes = showLakes && sources.lakes.length > 0 && (state === 'all' || state === 'ny')
  const nyStocked = showStocking && sources.nyStocking.length > 0 && (state === 'all' || state === 'ny')
  const meStocked = showStocking && sources.meStocking.length > 0 && (state === 'all' || state === 'me')

  if (showRivers) {
    for (const gauge of sources.gauges) {
      const code = freshwaterStateCode(gauge.state)
      if (state !== 'all' && code !== state) continue
      const name = plainWaterName(gauge.name)
      const flow = gauge.flowState === 'value' ? gauge.flow : null
      const temp = gauge.tempState === 'value' ? gauge.temp : null
      const verdict = gauge.verdict?.trim() ? gauge.verdict : null
      rows.push({
        ...EMPTY_FIELDS,
        id: `river-${gauge.site}`,
        name,
        stateLabel: code ? freshwaterStateLabel(code) : '—',
        stateCode: code,
        kind: 'River',
        status: verdict,
        href: `/fishing/${gauge.site}`,
        usgsHref: gauge.usgsHref,
        search: haystack(name, gauge.name, gauge.county, gauge.state, gauge.region, gauge.site, verdict, flow, temp, 'river'),
        site: gauge.site,
        flow,
        flowSort: leadingNumber(flow),
        flowState: gauge.flowState,
        temp,
        tempState: gauge.tempState,
        verdict,
        county: gauge.county,
        lat: gauge.lat,
        lon: gauge.lon,
      })
    }
  }

  if (nyLakes) {
    for (const lake of sources.lakes) {
      const name = plainWaterName(lake.name)
      const point = lake.lat != null && lake.lon != null
        ? { lat: lake.lat, lon: lake.lon }
        : locateWater(name, lake.county, 'ny', places)
      rows.push({
        ...EMPTY_FIELDS,
        id: `lake-${lake.id}`,
        name,
        stateLabel: 'NY',
        stateCode: 'ny',
        kind: 'Lake',
        status: lake.species,
        search: haystack(name, lake.county, lake.species, lake.launch, lake.note, 'lake', 'ny'),
        county: lake.county,
        species: lake.species,
        launch: lake.launch,
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
      })
    }
  }

  if (nyStocked) {
    for (const row of sources.nyStocking) {
      const name = plainWaterName(row.waterbody)
      const point = locateWater(name, row.county, 'ny', places)
      rows.push({
        ...EMPTY_FIELDS,
        id: `ny-stock-${row.id}`,
        name,
        stateLabel: 'NY',
        stateCode: 'ny',
        kind: 'Stocking',
        status: row.when,
        search: haystack(name, row.county, row.town, row.species, row.when, row.number, 'stocking', 'ny'),
        county: row.county,
        species: row.species,
        when: row.when,
        number: row.number,
        numberSort: countNumber(row.number),
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
      })
    }
    sourceLinks.push(...(STOCKING_LINKS.ny ?? []))
  }

  if (meStocked) {
    sources.meStocking.forEach((row, index) => {
      const name = plainWaterName(row.water)
      const point = locateWater(name, row.county, 'me', places)
      rows.push({
        ...EMPTY_FIELDS,
        id: `me-stock-${row.date}-${row.water}-${index}`,
        name,
        stateLabel: 'ME',
        stateCode: 'me',
        kind: 'Stocking',
        status: row.date,
        search: haystack(name, row.county, row.town, row.species, row.date, row.quantity, 'stocking', 'me'),
        county: row.county,
        species: row.species,
        when: row.date,
        number: row.quantity,
        numberSort: countNumber(row.quantity),
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
      })
    })
    sourceLinks.push(...(STOCKING_LINKS.me ?? []))
  }

  for (const code of statesIn(state)) {
    if (showLakes && !(code === 'ny' && nyLakes)) {
      for (const [index, link] of (LAKE_LINKS[code] ?? []).entries()) {
        rows.push(linkRow(code, 'Lake', link, index))
      }
    }
    if (showStocking && !((code === 'ny' && nyStocked) || (code === 'me' && meStocked))) {
      for (const [index, link] of (STOCKING_LINKS[code] ?? []).entries()) {
        rows.push(linkRow(code, 'Stocking', link, index))
      }
    }
  }

  return { rows, sourceLinks, emptyLinks: rows.length === 0 ? stateLinks(state) : [] }
}

function catalogPlaces(sources: FreshwaterSources): WaterPlace[] {
  const places: WaterPlace[] = []
  for (const gauge of sources.gauges) {
    if (gauge.lat == null || gauge.lon == null) continue
    places.push({
      name: gauge.name,
      county: gauge.county,
      state: freshwaterStateCode(gauge.state),
      lat: gauge.lat,
      lon: gauge.lon,
    })
  }
  for (const lake of sources.lakes) {
    if (lake.lat == null || lake.lon == null) continue
    places.push({
      name: lake.name,
      county: lake.county,
      state: 'ny',
      lat: lake.lat,
      lon: lake.lon,
    })
  }
  return places
}

function linkRow(code: FreshwaterState, kind: FreshwaterKind, link: OutboundLink, index: number): FreshwaterRow {
  return {
    ...EMPTY_FIELDS,
    id: `link-${kind.toLowerCase()}-${code}-${index}`,
    name: link.label,
    stateLabel: freshwaterStateLabel(code),
    stateCode: code,
    kind,
    href: link.href,
    external: true,
    search: haystack(link.label, link.note, kind, freshwaterStateLabel(code), 'link'),
  }
}

function stateLinks(state: FreshwaterStateFilter): OutboundLink[] {
  if (state === 'all') return []
  const seen = new Set<string>()
  const links = [...(LAKE_LINKS[state] ?? []), ...(STOCKING_LINKS[state] ?? [])]
  return links.filter((link) => {
    if (seen.has(link.href)) return false
    seen.add(link.href)
    return true
  })
}
