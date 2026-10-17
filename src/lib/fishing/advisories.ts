export const ADVISORIES_CHECKED = '2026-10-17'
export const ADVISORIES_SOURCE = 'https://www.health.ny.gov/environmental/outdoors/fish/health_advisories/regional/new_york_city.htm'

export type WaterBody = {
  id: string
  name: string
}

export const WATER_BODIES: WaterBody[] = [
  { id: 'lower-bay', name: 'Lower New York Bay, and Raritan Bay east of Wolfe’s Pond' },
  { id: 'raritan-west', name: 'Raritan Bay west of Wolfe’s Pond' },
  { id: 'upper-bay', name: 'Upper New York Bay, north of the Verrazano' },
  { id: 'kills', name: 'Arthur Kill, Kill Van Kull, and Newark Bay' },
]

export type Advisory = {
  id: string
  waterId: string
  fish: string
  general: string
  sensitive: string
}

/**
 * NYS DOH New York City and marine advisories, read 2026-10-17.
 * Sensitive means people who can become pregnant (under 50) and children under 15.
 */
export const ADVISORIES: Advisory[] = [
  { id: 'lower-striper', waterId: 'lower-bay', fish: 'Striped bass', general: 'Up to 4 meals/month', sensitive: 'Up to 1 meal/month' },
  { id: 'lower-bluefish', waterId: 'lower-bay', fish: 'Bluefish', general: 'Up to 4 meals/month', sensitive: 'Up to 1 meal/month' },
  { id: 'lower-weakfish', waterId: 'lower-bay', fish: 'Weakfish', general: 'Over 25": 1 meal/month. Under 25": 4 meals/month', sensitive: 'Over 25": do not eat. Under 25": 1 meal/month' },
  { id: 'lower-other', waterId: 'lower-bay', fish: 'Other fish and crabs', general: 'FDA guidelines', sensitive: 'FDA guidelines' },
  { id: 'west-striper', waterId: 'raritan-west', fish: 'Striped bass', general: 'Up to 1 meal/month', sensitive: 'Do not eat' },
  { id: 'west-bluefish', waterId: 'raritan-west', fish: 'Bluefish', general: 'Up to 1 meal/month', sensitive: 'Do not eat' },
  { id: 'west-other', waterId: 'raritan-west', fish: 'Other fish', general: 'Up to 4 meals/month', sensitive: 'Do not eat' },
  { id: 'upper-striper', waterId: 'upper-bay', fish: 'Striped bass', general: 'Up to 1 meal/month', sensitive: 'Do not eat' },
  { id: 'upper-bluefish', waterId: 'upper-bay', fish: 'Bluefish', general: 'Up to 1 meal/month', sensitive: 'Do not eat' },
  { id: 'upper-other', waterId: 'upper-bay', fish: 'Other fish', general: 'Up to 4 meals/month', sensitive: 'Do not eat' },
  { id: 'kills-striper', waterId: 'kills', fish: 'Striped bass', general: 'Do not eat', sensitive: 'Do not eat' },
  { id: 'kills-bluefish', waterId: 'kills', fish: 'Bluefish', general: 'Up to 1 meal/month', sensitive: 'Do not eat' },
  { id: 'kills-other', waterId: 'kills', fish: 'Other fish', general: 'Up to 4 meals/month', sensitive: 'Do not eat' },
]

export function waterBody(id: string): WaterBody | null {
  return WATER_BODIES.find((water) => water.id === id) ?? null
}

export function adviceFor(waterId: string): Advisory[] {
  return ADVISORIES.filter((row) => row.waterId === waterId)
}
