/**
 * Mountain gauges for the fishing table.
 *
 * Each site number was returned by the USGS monitoring-locations API on
 * 2026-10-15. Names, counties, and coordinates are read from USGS at request
 * time and are not stored here. A site is listed only when that check showed
 * a stream in the Catskills, Adirondacks, Green Mountains, White Mountains,
 * or Maine, and a current continuous series (or a live latest value).
 *
 * Left off on purpose: lake sites (Champlain, West Grand Lake), gauges with
 * no current continuous record (Batten Kill at Arlington, Androscoggin at
 * Gilead, Dead River at The Forks, West Branch Ausable at Lake Placid and
 * Wilmington), and Schoharie Creek at Fort Hunter, which is outside the mountains.
 * Laplatte River at Shelburne Falls is in the Champlain valley, so it is not
 * listed under the Greens.
 */
export const FISHING_REGIONS = ['Catskills', 'Adirondacks', 'Greens', 'Whites', 'Maine'] as const

export type FishingRegion = (typeof FISHING_REGIONS)[number]

export type CuratedGauge = {
  site: string
  region: FishingRegion
}

export const MOUNTAIN_GAUGES: CuratedGauge[] = [
  { site: '0136219503', region: 'Catskills' },
  { site: '01362200', region: 'Catskills' },
  { site: '01362500', region: 'Catskills' },
  { site: '0143400680', region: 'Catskills' },
  { site: '01434021', region: 'Catskills' },
  { site: '01434025', region: 'Catskills' },
  { site: '01434498', region: 'Catskills' },
  { site: '01435000', region: 'Catskills' },
  { site: '01417500', region: 'Catskills' },
  { site: '01419500', region: 'Catskills' },
  { site: '01420500', region: 'Catskills' },
  { site: '01421500', region: 'Catskills' },
  { site: '01423000', region: 'Catskills' },
  { site: '01425000', region: 'Catskills' },
  { site: '01426500', region: 'Catskills' },
  { site: '01427000', region: 'Catskills' },
  { site: '01350000', region: 'Catskills' },
  { site: '04274185', region: 'Adirondacks' },
  { site: '04253296', region: 'Adirondacks' },
  { site: '04275000', region: 'Adirondacks' },
  { site: '01312000', region: 'Adirondacks' },
  { site: '01315500', region: 'Adirondacks' },
  { site: '01135100', region: 'Greens' },
  { site: '01144000', region: 'Greens' },
  { site: '04288000', region: 'Greens' },
  { site: '010642505', region: 'Whites' },
  { site: '01129200', region: 'Whites' },
  { site: '01129500', region: 'Whites' },
  { site: '01157000', region: 'Whites' },
  { site: '01074520', region: 'Whites' },
  { site: '01075000', region: 'Whites' },
  { site: '01137500', region: 'Whites' },
  { site: '01054200', region: 'Maine' },
  { site: '01029100', region: 'Maine' },
]

export const MOUNTAIN_NY_COUNTIES = [
  'Delaware',
  'Greene',
  'Sullivan',
  'Ulster',
  'Schoharie',
  'Otsego',
  'Essex',
  'Franklin',
  'Hamilton',
  'Herkimer',
  'Warren',
  'Clinton',
  'Lewis',
  'St Lawrence',
] as const
