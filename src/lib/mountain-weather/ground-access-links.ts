import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';
import type { GroundLink } from '@/lib/mountain-weather/ground-access-types';

type Rule = GroundLink & {
  states?: MountainStateCode[];
  sections?: string[];
  placeIds?: string[];
};

const RULES: Rule[] = [
  {
    id: 'ny-dec-adk',
    label: 'Adirondack backcountry information (DEC)',
    href: 'https://dec.ny.gov/things-to-do/hiking/adirondack-backcountry-information',
    org: 'NY DEC',
    mode: 'link',
    states: ['ny'],
    sections: ['adirondack-high-peaks', 'northern-adirondacks', 'central-southern-adirondacks'],
  },
  {
    id: 'ny-dec-cats',
    label: 'Catskill backcountry information (DEC)',
    href: 'https://dec.ny.gov/things-to-do/hiking/catskill-backcountry-information',
    org: 'NY DEC',
    mode: 'link',
    states: ['ny'],
    sections: ['catskill-mountains'],
  },
  {
    id: 'ny-fire',
    label: 'NY DEC fire danger map',
    href: 'https://dec.ny.gov/environmental-protection/wildfires/fire-danger-map',
    org: 'NY DEC',
    mode: 'link',
    states: ['ny'],
  },
  {
    id: 'gmc',
    label: 'Green Mountain Club trail notices',
    href: 'https://greenmountainclub.org/trail-closures/',
    org: 'Green Mountain Club',
    mode: 'link',
    states: ['vt'],
  },
  {
    id: 'gmnf',
    label: 'Green Mountain National Forest alerts',
    href: 'https://www.fs.usda.gov/r09/gmfl/alerts',
    org: 'USFS',
    mode: 'link',
    states: ['vt'],
  },
  {
    id: 'wmnf',
    label: 'White Mountain National Forest alerts',
    href: 'https://www.fs.usda.gov/whitemountain',
    org: 'USFS',
    mode: 'link',
    states: ['nh'],
  },
  {
    id: 'mwobs-hsf',
    label: 'MWOBS Higher Summits Forecast',
    href: 'https://mountwashington.org/weather/higher-summits-forecast/',
    org: 'MWOBS',
    mode: 'link',
    states: ['nh'],
    sections: ['presidential-range', 'franconia-pemi'],
  },
  {
    id: 'baxter-rpt',
    label: 'Baxter State Park conditions',
    href: 'https://baxterstatepark.org/conditions-report/',
    org: 'Baxter State Park',
    mode: 'link',
    states: ['me'],
    sections: ['baxter-state-park'],
  },
  {
    id: 'wfas',
    label: 'WFAS national fire danger maps',
    href: 'https://www.wfas.net/',
    org: 'USFS WFAS',
    mode: 'link',
    states: ['vt', 'nh', 'me'],
  },
  {
    id: 'nh-511',
    label: 'New Hampshire 511 (roads & cameras)',
    href: 'https://newengland511.org/',
    org: 'NH DOT / NE Compass',
    mode: 'link',
    states: ['nh'],
  },
  {
    id: 'vt-511',
    label: 'Vermont 511 (roads & cameras)',
    href: 'https://newengland511.org/',
    org: 'VT DOT / NE Compass',
    mode: 'link',
    states: ['vt'],
  },
  {
    id: 'me-511',
    label: 'Maine 511 (roads & cameras)',
    href: 'https://newengland511.org/',
    org: 'Maine DOT / NE Compass',
    mode: 'link',
    states: ['me'],
  },
  {
    id: 'drought-portal',
    label: 'U.S. Drought Monitor',
    href: 'https://droughtmonitor.unl.edu/',
    org: 'NDMC/USDA/NOAA',
    mode: 'link',
  },
];

export function groundLinksForPlace(state: MountainStateCode, sectionId: string, place: MountainPlace): GroundLink[] {
  return RULES.filter((rule) => {
    if (rule.placeIds && !rule.placeIds.includes(place.id)) return false;
    if (rule.sections && !rule.sections.includes(sectionId)) return false;
    if (rule.states && !rule.states.includes(state)) return false;
    return true;
  }).map(({ id, label, href, org, mode }) => ({ id, label, href, org, mode }));
}