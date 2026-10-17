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
import { plainWaterName, type GaugeView } from '@/lib/fishing/readings'
import type { ActualStocking } from '@/lib/fishing/stocking'

export type FreshwaterKind = 'River' | 'Lake' | 'Stocking'

export type FreshwaterRow = {
  id: string
  name: string
  stateLabel: string
  stateCode: FreshwaterState | null
  kind: FreshwaterKind
  detail: string
  href: string | null
  external: boolean
  search: string
  site: string | null
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

function joinDetail(parts: (string | null | undefined)[], empty: string): string {
  const text = parts.filter((part): part is string => Boolean(part && part.trim()))
  return text.length > 0 ? text.join(' · ') : empty
}

function riverDetail(gauge: GaugeView): string {
  const flow = gauge.flowState === 'value' ? gauge.flow : null
  const temp = gauge.tempState === 'value' ? gauge.temp : null
  return joinDetail([gauge.verdict, flow, temp], 'No current reading')
}

export function assembleFreshwaterRows(
  state: FreshwaterStateFilter,
  tab: FreshwaterTab,
  sources: FreshwaterSources,
): FreshwaterListing {
  const rows: FreshwaterRow[] = []
  const sourceLinks: OutboundLink[] = []
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
      const detail = riverDetail(gauge)
      rows.push({
        id: `river-${gauge.site}`,
        name,
        stateLabel: code ? freshwaterStateLabel(code) : '—',
        stateCode: code,
        kind: 'River',
        detail,
        href: `/fishing/${gauge.site}`,
        external: false,
        search: haystack(name, gauge.name, gauge.county, gauge.state, gauge.region, gauge.site, detail, 'river'),
        site: gauge.site,
      })
    }
  }

  if (nyLakes) {
    for (const lake of sources.lakes) {
      const name = plainWaterName(lake.name)
      const detail = joinDetail([lake.species, lake.launch], 'Public water')
      rows.push({
        id: `lake-${lake.id}`,
        name,
        stateLabel: 'NY',
        stateCode: 'ny',
        kind: 'Lake',
        detail,
        href: null,
        external: false,
        search: haystack(name, lake.county, lake.species, lake.launch, lake.note, detail, 'lake', 'ny'),
        site: null,
      })
    }
  }

  if (nyStocked) {
    for (const row of sources.nyStocking) {
      const name = plainWaterName(row.waterbody)
      const detail = joinDetail([row.when, row.species, row.number], row.when)
      rows.push({
        id: `ny-stock-${row.id}`,
        name,
        stateLabel: 'NY',
        stateCode: 'ny',
        kind: 'Stocking',
        detail,
        href: null,
        external: false,
        search: haystack(name, row.county, row.town, row.species, row.when, detail, 'stocking', 'ny'),
        site: null,
      })
    }
    sourceLinks.push(...(STOCKING_LINKS.ny ?? []))
  }

  if (meStocked) {
    sources.meStocking.forEach((row, index) => {
      const name = plainWaterName(row.water)
      const detail = joinDetail([row.date, row.species, row.quantity], row.date)
      rows.push({
        id: `me-stock-${row.date}-${row.water}-${index}`,
        name,
        stateLabel: 'ME',
        stateCode: 'me',
        kind: 'Stocking',
        detail,
        href: null,
        external: false,
        search: haystack(name, row.county, row.town, row.species, row.date, detail, 'stocking', 'me'),
        site: null,
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

function linkRow(code: FreshwaterState, kind: FreshwaterKind, link: OutboundLink, index: number): FreshwaterRow {
  return {
    id: `link-${kind.toLowerCase()}-${code}-${index}`,
    name: link.label,
    stateLabel: freshwaterStateLabel(code),
    stateCode: code,
    kind,
    detail: link.note,
    href: link.href,
    external: true,
    search: haystack(link.label, link.note, kind, freshwaterStateLabel(code), 'link'),
    site: null,
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
