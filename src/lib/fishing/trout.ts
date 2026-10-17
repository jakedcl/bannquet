export const TROUT_CHECKED = '2026-10-17'
export const TROUT_SOURCE = 'https://dec.ny.gov/things-to-do/freshwater-fishing/regulations/statewide-season-sizes-catch-limits'

export type TroutStatus = {
  title: string
  detail: string
}

function monthDay(isoDate: string): string {
  return isoDate.slice(5)
}

/** Statewide inland trout streams. Special regulations can override this. */
export function troutStreamStatus(isoDate: string): TroutStatus {
  const day = monthDay(isoDate)
  const harvest = day >= '04-01' && day <= '10-15'
  if (harvest) {
    return {
      title: 'Trout streams open',
      detail: 'Apr 1 – Oct 15. 5 fish, only 2 longer than 12".',
    }
  }
  return {
    title: 'Trout streams, catch and release',
    detail: 'Oct 16 – Mar 31. Artificial lures only.',
  }
}
