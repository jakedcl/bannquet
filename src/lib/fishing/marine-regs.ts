import { easternDate } from '@/lib/fishing/clock'

export const MARINE_REGS_CHECKED = '2026-10-17'
export const MARINE_REGS_SOURCE = 'https://dec.ny.gov/things-to-do/saltwater-fishing/recreational-fishing-regulations'

export type SeasonWindow = {
  start: string
  end: string
  size: string
  bag: string
}

export type MarineSpecies = {
  id: string
  name: string
  season: string
  size: string
  bag: string
  windows: SeasonWindow[]
}

/**
 * Recreational marine limits from the NYS DEC saltwater page.
 * The page stated these were last changed on May 12, 2026.
 * Staten Island ocean water is the NY Bight, not Long Island Sound.
 */
export const MARINE_SPECIES: MarineSpecies[] = [
  {
    id: 'striped-bass-marine',
    name: 'Striped bass, marine',
    season: 'Apr 15 – Dec 15',
    size: '28–31" slot',
    bag: '1',
    windows: [{ start: '04-15', end: '12-15', size: '28–31" slot', bag: '1' }],
  },
  {
    id: 'striped-bass-hudson',
    name: 'Striped bass, Hudson north of GWB',
    season: 'Apr 1 – Nov 30',
    size: '23–28" slot',
    bag: '1',
    windows: [{ start: '04-01', end: '11-30', size: '23–28" slot', bag: '1' }],
  },
  {
    id: 'fluke',
    name: 'Summer flounder (fluke)',
    season: 'May 4 – Oct 15',
    size: '19", then 19.5"',
    bag: '3',
    windows: [
      { start: '05-04', end: '08-01', size: '19"', bag: '3' },
      { start: '08-02', end: '10-15', size: '19.5"', bag: '3' },
    ],
  },
  {
    id: 'porgy',
    name: 'Scup (porgy)',
    season: 'May 1 – Dec 31',
    size: '9.5" shore, 11" boat',
    bag: '30',
    windows: [{ start: '05-01', end: '12-31', size: '9.5" shore, 11" boat', bag: '30' }],
  },
  {
    id: 'blackfish-bight',
    name: 'Tautog (blackfish), NY Bight',
    season: 'Apr 1–30 and Oct 15 – Dec 22',
    size: '16"',
    bag: '2, then 4',
    windows: [
      { start: '04-01', end: '04-30', size: '16"', bag: '2' },
      { start: '10-15', end: '12-22', size: '16"', bag: '4' },
    ],
  },
  {
    id: 'blackfish-sound',
    name: 'Tautog (blackfish), Long Island Sound',
    season: 'Apr 1–30 and Oct 11 – Dec 9',
    size: '16"',
    bag: '2, then 3',
    windows: [
      { start: '04-01', end: '04-30', size: '16"', bag: '2' },
      { start: '10-11', end: '12-09', size: '16"', bag: '3' },
    ],
  },
  {
    id: 'bluefish',
    name: 'Bluefish',
    season: 'All year',
    size: 'No size limit',
    bag: '5',
    windows: [{ start: '01-01', end: '12-31', size: 'No size limit', bag: '5' }],
  },
  {
    id: 'weakfish',
    name: 'Weakfish',
    season: 'All year',
    size: '16"',
    bag: '1',
    windows: [{ start: '01-01', end: '12-31', size: '16"', bag: '1' }],
  },
  {
    id: 'black-sea-bass',
    name: 'Black sea bass',
    season: 'May 16 – Dec 31',
    size: '16"',
    bag: '3, then 6',
    windows: [
      { start: '05-16', end: '08-31', size: '16"', bag: '3' },
      { start: '09-01', end: '12-31', size: '16"', bag: '6' },
    ],
  },
  {
    id: 'winter-flounder',
    name: 'Winter flounder',
    season: 'Apr 1 – May 30',
    size: '12"',
    bag: '2',
    windows: [{ start: '04-01', end: '05-30', size: '12"', bag: '2' }],
  },
  {
    id: 'eel',
    name: 'American eel',
    season: 'All year',
    size: '9"',
    bag: '25',
    windows: [{ start: '01-01', end: '12-31', size: '9"', bag: '25' }],
  },
]

export type RegStatus = {
  id: string
  name: string
  status: 'Open' | 'Closed'
  size: string
  bag: string
  season: string
}

function monthDay(isoDate: string): string {
  return isoDate.slice(5)
}

function inWindow(day: string, start: string, end: string): boolean {
  if (start <= end) return day >= start && day <= end
  return day >= start || day <= end
}

export function regulationOn(species: MarineSpecies, isoDate: string): RegStatus {
  const day = monthDay(isoDate)
  const open = species.windows.find((window) => inWindow(day, window.start, window.end))
  return {
    id: species.id,
    name: species.name,
    status: open ? 'Open' : 'Closed',
    size: open?.size ?? species.size,
    bag: open?.bag ?? species.bag,
    season: species.season,
  }
}

export function regulationsOn(isoDate: string): RegStatus[] {
  return MARINE_SPECIES.map((species) => regulationOn(species, isoDate))
}

export function openSpecies(isoDate: string): RegStatus[] {
  return regulationsOn(isoDate).filter((row) => row.status === 'Open')
}

export function regulationsToday(now: number): RegStatus[] {
  return regulationsOn(easternDate(now))
}
