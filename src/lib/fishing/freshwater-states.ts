export const FRESHWATER_STATES = [
  { code: 'ny', label: 'NY' },
  { code: 'nj', label: 'NJ' },
  { code: 'pa', label: 'PA' },
  { code: 'ct', label: 'CT' },
  { code: 'ma', label: 'MA' },
  { code: 'vt', label: 'VT' },
  { code: 'nh', label: 'NH' },
  { code: 'me', label: 'ME' },
] as const

export type FreshwaterState = (typeof FRESHWATER_STATES)[number]['code']
export type FreshwaterTab = 'rivers' | 'lakes' | 'stocking'

const NAMES: Record<string, FreshwaterState> = {
  ny: 'ny',
  'new york': 'ny',
  nj: 'nj',
  'new jersey': 'nj',
  pa: 'pa',
  pennsylvania: 'pa',
  ct: 'ct',
  connecticut: 'ct',
  ma: 'ma',
  massachusetts: 'ma',
  vt: 'vt',
  vermont: 'vt',
  nh: 'nh',
  'new hampshire': 'nh',
  me: 'me',
  maine: 'me',
}

export function freshwaterStateCode(state: string | null | undefined): FreshwaterState | null {
  if (!state) return null
  return NAMES[state.trim().toLowerCase()] ?? null
}

export function readFreshwaterState(value: string | undefined): FreshwaterState {
  return freshwaterStateCode(value) ?? 'ny'
}

export function readFreshwaterTab(value: string | undefined): FreshwaterTab {
  if (value === 'lakes' || value === 'stocking') return value
  return 'rivers'
}

export function freshwaterHref(state: FreshwaterState, tab: FreshwaterTab): string {
  if (state === 'ny' && tab === 'rivers') return '/fishing/freshwater'
  const params = new URLSearchParams()
  if (state !== 'ny') params.set('state', state)
  if (tab !== 'rivers') params.set('tab', tab)
  const query = params.toString()
  return query ? `/fishing/freshwater?${query}` : '/fishing/freshwater'
}

export type OutboundLink = {
  href: string
  label: string
  note: string
}

export const LAKE_LINKS: Partial<Record<FreshwaterState, OutboundLink[]>> = {
  nj: [{ href: 'https://dep.nj.gov/njfw/fishing/freshwater/', label: 'Freshwater fishing', note: 'NJ Fish and Wildlife. No free lake table copied here.' }],
  pa: [{ href: 'https://www.pa.gov/agencies/fishandboat/fishing', label: 'Fishing', note: 'Pennsylvania Fish and Boat Commission.' }],
  ct: [{ href: 'https://portal.ct.gov/deep/fishing', label: 'Fishing', note: 'Connecticut DEEP.' }],
  ma: [{ href: 'https://www.mass.gov/info-details/trout-stocking-report', label: 'Trout stocking report', note: 'MassWildlife. Includes stocked waters.' }],
  vt: [{ href: 'https://vtfishandwildlife.com/fish/fishing-regulations', label: 'Fishing regulations', note: 'Vermont Fish and Wildlife.' }],
  nh: [{ href: 'https://www.wildlife.nh.gov/fishing-new-hampshire', label: 'Fishing in New Hampshire', note: 'NH Fish and Game.' }],
  me: [{ href: 'https://www.maine.gov/ifw/fishing-boating/fishing/laws-rules/index.html', label: 'Fishing laws and rules', note: 'Maine DIFW.' }],
}

export const STOCKING_LINKS: Partial<Record<FreshwaterState, OutboundLink[]>> = {
  ny: [
    { href: 'https://data.ny.gov/Recreation/Fish-Stocking-Lists-Actual-Beginning-2011/e52k-ymww', label: 'Actual stocking lists', note: 'data.ny.gov. Month and year, not a day.' },
    { href: 'https://dec.ny.gov/things-to-do/freshwater-fishing/stocking', label: 'DEC stocking', note: 'Current season page.' },
  ],
  nj: [{ href: 'https://dep.nj.gov/njfw/fishing/freshwater/spring-trout-stocking/', label: 'Spring trout stocking', note: 'NJ Fish and Wildlife. Not copied here.' }],
  pa: [{ href: 'https://www.pa.gov/agencies/fishandboat/fishing/stocking', label: 'Stocking', note: 'Pennsylvania Fish and Boat Commission. Not copied here.' }],
  ct: [{ href: 'https://portal.ct.gov/-/media/DEEP/fishing/weekly_reports/CurrentStockingReport.pdf', label: 'Current stocking report (PDF)', note: 'Connecticut DEEP. Dates stay in the PDF.' }],
  ma: [{ href: 'https://www.mass.gov/info-details/trout-stocking-report', label: 'Trout stocking report', note: 'MassWildlife daily table. Not copied here.' }],
  vt: [{ href: 'https://anrweb.vt.gov/FWD/FW/FishStockingSchedule.aspx', label: 'Stocking schedule', note: 'Vermont Fish and Wildlife. Not copied here.' }],
  nh: [{ href: 'https://www.wildlife.nh.gov/fishing-new-hampshire/stocking-report', label: 'Stocking report', note: 'NH Fish and Game. Not copied here.' }],
  me: [{ href: 'https://www.maine.gov/ifw/docs/current_stocking_report.pdf', label: 'Current stocking report (PDF)', note: 'The same file this page reads.' }],
}
