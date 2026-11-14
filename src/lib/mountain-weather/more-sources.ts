import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

export type MoreSourceLink = {
  label: string;
  href: string;
  org: string;
  mode: 'ui' | 'link';
};

export type MoreSourceScope = 'place' | 'section' | 'state';

type MoreSourceEntry = MoreSourceLink & {
  id: string;
  scope: MoreSourceScope;
  states?: MountainStateCode[];
  sections?: string[];
  offices?: MountainPlace['office'][];
  placeIds?: string[];
};

export type MoreSourceGroups = Record<'office' | 'mountain' | 'land' | 'national', MoreSourceLink[]>;

const OFFICE_HUB: Record<MountainPlace['office'], string> = {
  BTV: 'https://www.weather.gov/btv',
  ALY: 'https://www.weather.gov/aly',
  GYX: 'https://www.weather.gov/gyx',
  CAR: 'https://www.weather.gov/car',
  BOX: 'https://www.weather.gov/box',
  OKX: 'https://www.weather.gov/okx',
};

const STATE_FOR_OFFICE: Record<MountainPlace['office'], string> = {
  BTV: 'VT',
  ALY: 'NY',
  GYX: 'NH',
  CAR: 'ME',
  BOX: 'MA',
  OKX: 'NY',
};

const OFFICES_BY_STATE: Record<MountainStateCode, MountainPlace['office'][]> = {
  ny: ['BTV', 'ALY', 'OKX'],
  vt: ['BTV', 'ALY', 'BOX'],
  nh: ['GYX', 'ALY'],
  me: ['CAR', 'GYX'],
};

const SECTIONS_WITH_MOUNTAIN_VIEWER = new Set([
  'adirondack-high-peaks',
  'northern-adirondacks',
  'central-southern-adirondacks',
  'catskill-mountains',
  'jay-peak',
  'northern-greens',
  'central-greens',
  'northeast-kingdom',
  'southern-greens',
]);

function todayParts() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { y, m, day, iso: `${y}-${m}-${day}` };
}

type CatalogContext = {
  stateCode: MountainStateCode;
  sectionId?: string;
  place?: MountainPlace;
};

function baseCatalog(ctx: CatalogContext): MoreSourceEntry[] {
  const { stateCode, sectionId, place } = ctx;
  const { y, m, day, iso } = todayParts();
  const state = stateCode.toUpperCase();
  const offices = place ? [place.office] : OFFICES_BY_STATE[stateCode];
  const lat = place?.lat ?? null;
  const lon = place?.lon ?? null;
  const cocorahs = `https://data.cocorahs.org/export/exportreports.aspx?ReportType=Daily&dtf=1&Format=CSV&State=${state}&ReportDateType=reportdate&Date=${m}/${day}/${y}&TimesInGMT=False`;
  const iem = `${state}_COOP`;

  const entries: MoreSourceEntry[] = [];

  if (place && lat !== null && lon !== null) {
    entries.push(
      {
        id: 'mapclick',
        scope: 'place',
        org: 'NWS',
        label: '7-day and hourly forecast (MapClick)',
        href: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`,
        mode: 'link',
        placeIds: [place.id],
      },
      {
        id: 'alerts-point',
        scope: 'place',
        org: 'NWS',
        label: 'Active alerts API (point)',
        href: `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
        mode: 'link',
        placeIds: [place.id],
      },
      {
        id: 'usno',
        scope: 'place',
        org: 'US Naval Observatory',
        label: 'Sun, moon, twilight',
        href: `https://aa.usno.navy.mil/api/rstt/oneday?date=${iso}&coords=${lat},${lon}&tz=-5`,
        mode: 'link',
        placeIds: [place.id],
      },
    );
    if (place.office === 'BTV') {
      entries.push({
        id: 'btv-balloon-xml',
        scope: 'place',
        org: 'NWS Burlington',
        label: 'Hot air balloon / ridge wind forecast (XML)',
        href: 'https://www.weather.gov/source/btv/rec/balloon.xml',
        mode: 'link',
        offices: ['BTV'],
        placeIds: [place.id],
      });
    }
    if (place.office === 'ALY') {
      entries.push({
        id: 'aly-fzl',
        scope: 'place',
        org: 'NWS Albany',
        label: 'Observed freezing level (FZL; link only)',
        href: 'https://www.weather.gov/source/aly/rec/fzl.xml',
        mode: 'link',
        offices: ['ALY'],
        placeIds: [place.id],
      });
    }
    if (place.office === 'GYX') {
      entries.push({
        id: 'gyx-fzl',
        scope: 'place',
        org: 'NWS Gray',
        label: 'Observed freezing level (FZL; link only)',
        href: 'https://www.weather.gov/source/gyx/rec/fzl.xml',
        mode: 'link',
        offices: ['GYX'],
        placeIds: [place.id],
      });
    }
    if (place.id === 'mount-mansfield') {
      entries.push(
        {
          id: 'mansfield-enhanced-charts',
          scope: 'place',
          org: 'NWS Burlington',
          label: 'Mansfield hourly mountain charts',
          href: 'https://www.weather.gov/btv/mountain_enhanced?loc=MOUNT%20MANSFIELD',
          mode: 'link',
          placeIds: ['mount-mansfield'],
        },
        {
          id: 'btv-profile-page',
          scope: 'place',
          org: 'NWS Burlington',
          label: 'Elevation profile page',
          href: 'https://www.weather.gov/btv/profile',
          mode: 'link',
          placeIds: ['mount-mansfield'],
        },
        {
          id: 'mmnv1-timeseries',
          scope: 'place',
          org: 'NWS',
          label: 'MMNV1 time series',
          href: 'https://www.weather.gov/wrh/timeseries?site=MMNV1',
          mode: 'link',
          placeIds: ['mount-mansfield'],
        },
        {
          id: 'btv-mtn-dashboard',
          scope: 'place',
          org: 'NWS Burlington',
          label: 'Forecaster mountain dashboard (unofficial)',
          href: 'https://www.weather.gov/source/btv/rec/mtnDashboard.html',
          mode: 'link',
          placeIds: ['mount-mansfield'],
        },
      );
    }
    if (/whiteface/i.test(place.name)) {
      entries.push({
        id: 'whiteface-cam',
        scope: 'place',
        org: 'UAlbany ASRC',
        label: 'Whiteface timelapse',
        href: 'https://www.albany.edu/asrc/',
        mode: 'link',
        states: ['ny'],
        placeIds: ['whiteface-mountain'],
      });
    }
    if (place.id === 'mount-washington' || place.id === 'mount-adams') {
      entries.push(
        {
          id: 'rec-summits',
          scope: 'place',
          org: 'NWS Gray',
          label: 'REC (Summits above 4,000 ft)',
          href: 'https://api.weather.gov/products/types/REC/locations/GYX/latest',
          mode: 'link',
          states: ['nh'],
          sections: ['presidential-range'],
        },
        {
          id: 'gyx-alllocations',
          scope: 'place',
          org: 'NWS Gray',
          label: 'Mount Washington (allLocations)',
          href: 'https://www.weather.gov/source/gyx/rec/allLocations.xml',
          mode: 'link',
          states: ['nh'],
          sections: ['presidential-range'],
        },
      );
    }
  }

  if (sectionId && SECTIONS_WITH_MOUNTAIN_VIEWER.has(sectionId)) {
    for (const office of offices) {
      if (office === 'BTV' || office === 'ALY') {
        entries.push({
          id: `mountain-viewer-${office}-${sectionId}`,
          scope: 'section',
          org: `NWS ${office}`,
          label: 'Mountain forecast viewer',
          href: `https://www.weather.gov/${office.toLowerCase()}/mountain`,
          mode: 'link',
          offices: [office],
          sections: [sectionId],
        });
      }
    }
  }

  for (const office of offices) {
    const low = office.toLowerCase();
    const sftState = STATE_FOR_OFFICE[office];
    entries.push(
      { id: `office-home-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Office homepage', href: OFFICE_HUB[office], mode: 'link', offices: [office], states: [stateCode] },
      { id: `afd-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Area Forecast Discussion (AFD)', href: `https://api.weather.gov/products/types/AFD/locations/${office}/latest`, mode: 'link', offices: [office], states: [stateCode] },
      { id: `ghwo-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Graphical Hazardous Weather Outlook', href: `https://www.weather.gov/erh/ghwo?wfo=${low}`, mode: 'link', offices: [office], states: [stateCode] },
      { id: `zfp-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Zone Forecast (ZFP)', href: `https://api.weather.gov/products/types/ZFP/locations/${office}/latest`, mode: 'link', offices: [office], states: [stateCode] },
      { id: `sft-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Tabular State Forecast (SFT)', href: `https://api.weather.gov/products/types/SFT/locations/${sftState}/latest`, mode: 'link', offices: [office], states: [stateCode] },
      { id: `hyd-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Hydrologic summary (HYD)', href: `https://api.weather.gov/products/types/HYD/locations/${office}/latest`, mode: 'link', offices: [office], states: [stateCode] },
      { id: `rec-${office}`, scope: 'state', org: `NWS ${office}`, label: 'Recreation', href: `https://www.weather.gov/${low}/recreation`, mode: 'link', offices: [office], states: [stateCode] },
      {
        id: `winter-hub-${office}`,
        scope: 'state',
        org: 'NWS',
        label: 'Winter weather hub',
        href: `https://www.weather.gov/winter?sid=${low}`,
        mode: 'link',
        offices: [office],
        states: [stateCode],
      },
    );
  }

  entries.push(
    { id: 'cocorahs', scope: 'state', org: 'CoCoRaHS', label: `Daily reports (${state})`, href: cocorahs, mode: 'link', states: [stateCode] },
    { id: 'iem-coop', scope: 'state', org: 'Iowa Environmental Mesonet', label: `COOP currents (${iem})`, href: `https://mesonet.agron.iastate.edu/api/1/currents.json?network=${iem}`, mode: 'link', states: [stateCode] },
    { id: 'nohrsc-stations', scope: 'state', org: 'NOHRSC', label: 'Station snow depth reports (Northeast)', href: `https://www.nohrsc.noaa.gov/nsa/reports.html?region=Northeast&var=snowdepth&dy=${y}&dm=${m}&dd=${day}&units=e&sort=value&filter=0`, mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'nohrsc-map', scope: 'state', org: 'NOHRSC', label: 'Northeast snow analysis map', href: 'https://www.nohrsc.noaa.gov/nsa/index.html?region=Northeast', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'nerfc-snow', scope: 'state', org: 'NERFC', label: 'NOHRSC modeled depth, SWE, melt', href: 'https://www.weather.gov/nerfc/snow', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'radar-ne', scope: 'state', org: 'NWS', label: 'Northeast radar mosaic loop', href: 'https://radar.weather.gov/ridge/standard/NORTHEAST_loop.gif', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'goes-color', scope: 'state', org: 'NOAA STAR', label: 'GOES-19 Northeast (GeoColor)', href: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/600x600.jpg', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'goes-glm', scope: 'state', org: 'NOAA STAR', label: 'GOES-19 GLM lightning (Northeast)', href: 'https://cdn.star.nesdis.noaa.gov/GOES19/GLM/SECTOR/ne/EXTENT3/latest.jpg', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'wpc-wssi', scope: 'state', org: 'WPC', label: 'Winter Storm Severity Index', href: `https://www.wpc.ncep.noaa.gov/wwd/wssi/wssi.php?id=${offices[0]}`, mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'wpc-snow-prob', scope: 'state', org: 'WPC', label: 'Probabilistic snowfall (days 1–3)', href: 'https://www.wpc.ncep.noaa.gov/pwpf/wwd_accum_probs.php', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'wpc-snow-prob-d47', scope: 'state', org: 'WPC', label: 'Probabilistic snow, days 4–7', href: 'https://www.wpc.ncep.noaa.gov/wwd/pwpf_d47/pwpf_medr.php', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
    { id: 'prob-snow-howto', scope: 'state', org: 'NWS', label: 'How to read probabilistic snow', href: 'https://www.weather.gov/prob-snow', mode: 'link', states: ['ny', 'vt', 'nh', 'me'] },
  );

  if (stateCode === 'ny') {
    entries.push(
      { id: 'ny-dec-adk', scope: 'section', org: 'NY DEC', label: 'Adirondack backcountry information', href: 'https://dec.ny.gov/things-to-do/hiking/adirondack-backcountry-information', mode: 'link', states: ['ny'], sections: ['adirondack-high-peaks', 'northern-adirondacks', 'central-southern-adirondacks'] },
      { id: 'ny-dec-cats', scope: 'section', org: 'NY DEC', label: 'Catskill backcountry information', href: 'https://dec.ny.gov/things-to-do/hiking/catskill-backcountry-information', mode: 'link', states: ['ny'], sections: ['catskill-mountains'] },
      { id: 'nysac', scope: 'section', org: 'NY DEC', label: 'Adirondack avalanche (NYSAC)', href: 'https://www.dec.ny.gov/things-to-do/hiking/adirondack-avalanche', mode: 'link', states: ['ny'], sections: ['adirondack-high-peaks', 'northern-adirondacks'] },
      { id: 'ny-fire', scope: 'state', org: 'NY DEC', label: 'Fire danger map', href: 'https://dec.ny.gov/environmental-protection/wildfires/fire-danger-map', mode: 'link', states: ['ny'] },
      { id: 'nys-mesonet', scope: 'state', org: 'NYS Mesonet', label: 'Mesonet (personal use; link only)', href: 'https://www.nysmesonet.org/', mode: 'link', states: ['ny'] },
    );
  }
  if (stateCode === 'vt') {
    entries.push(
      { id: 'gmc', scope: 'state', org: 'Green Mountain Club', label: 'Trail conditions and notices', href: 'https://greenmountainclub.org/', mode: 'link', states: ['vt'] },
      { id: 'gmnf', scope: 'state', org: 'Green Mountain National Forest', label: 'Alerts', href: 'https://www.fs.usda.gov/r09/gmfl/alerts', mode: 'link', states: ['vt'] },
    );
  }
  if (stateCode === 'nh') {
    entries.push(
      { id: 'wmnf', scope: 'state', org: 'White Mountain National Forest', label: 'Forest alerts', href: 'https://www.fs.usda.gov/whitemountain', mode: 'link', states: ['nh'] },
      { id: 'mwobs-hsf', scope: 'section', org: 'MWOBS', label: 'Higher Summits Forecast (link only)', href: 'https://mountwashington.org/weather/higher-summits-forecast/', mode: 'link', states: ['nh'], sections: ['presidential-range', 'franconia-pemi'] },
      { id: 'mwac', scope: 'state', org: 'MWAC', label: 'Avalanche center map layer', href: 'https://api.avalanche.org/2/public/products/map-layer/MWAC', mode: 'link', states: ['nh'] },
    );
    if (sectionId === 'presidential-range') {
      entries.push(
        { id: 'rec-presidential', scope: 'section', org: 'NWS Gray', label: 'REC (Summits above 4,000 ft)', href: 'https://api.weather.gov/products/types/REC/locations/GYX/latest', mode: 'link', states: ['nh'], sections: ['presidential-range'] },
      );
    }
  }
  if (stateCode === 'me') {
    entries.push(
      { id: 'baxter-rpt', scope: 'section', org: 'Baxter State Park', label: 'Conditions report', href: 'https://baxterstatepark.org/conditions-report/', mode: 'link', states: ['me'], sections: ['baxter-state-park'] },
      { id: 'acadia-cond', scope: 'section', org: 'NPS', label: 'Acadia conditions', href: 'https://www.nps.gov/acad/planyourvisit/conditions.htm', mode: 'link', states: ['me'], sections: ['acadia'] },
      { id: 'car-baxter', scope: 'section', org: 'NWS Caribou', label: 'Baxter graphics', href: 'https://www.weather.gov/car/baxter', mode: 'link', states: ['me'], sections: ['baxter-state-park', 'mahoosucs-bigelow'] },
      { id: 'car-acadia', scope: 'section', org: 'NWS Caribou', label: 'Acadia graphics', href: 'https://www.weather.gov/car/acadia', mode: 'link', states: ['me'], sections: ['acadia'] },
    );
  }

  if (place) {
    entries.push(
      { id: 'pfm', scope: 'place', org: `NWS ${place.office}`, label: 'Point Forecast Matrix (PFM)', href: `https://api.weather.gov/products/types/PFM/locations/${place.office}/latest`, mode: 'link', offices: [place.office] },
      { id: 'fwf', scope: 'place', org: `NWS ${place.office}`, label: 'Fire Weather (FWF)', href: `https://api.weather.gov/products/types/FWF/locations/${place.office}/latest`, mode: 'link', offices: [place.office] },
      { id: 'pns', scope: 'place', org: `NWS ${place.office}`, label: 'Storm totals (PNS)', href: `https://api.weather.gov/products/types/PNS/locations/${place.office}/latest`, mode: 'link', offices: [place.office] },
      { id: 'cpc', scope: 'place', org: 'CPC', label: '6–10 and 8–14 day outlooks', href: 'https://www.cpc.ncep.noaa.gov/products/predictions/610day/', mode: 'link' },
      { id: 'spc', scope: 'place', org: 'SPC', label: 'Convective outlooks', href: 'https://www.spc.noaa.gov/products/outlook/', mode: 'link' },
      { id: 'airnow', scope: 'place', org: 'EPA AirNow', label: 'Air quality', href: 'https://www.airnow.gov/', mode: 'link' },
      { id: 'drought', scope: 'place', org: 'NDMC', label: 'U.S. Drought Monitor', href: 'https://droughtmonitor.unl.edu/', mode: 'link' },
      { id: 'wfas', scope: 'place', org: 'USFS', label: 'Wildland Fire Assessment System', href: 'https://www.wfas.net/', mode: 'link' },
      { id: 'ncei', scope: 'place', org: 'NCEI', label: 'Climate Data Online', href: 'https://www.ncei.noaa.gov/cdo-web/', mode: 'link' },
    );
  }

  return entries;
}

function matchesContext(entry: MoreSourceEntry, ctx: CatalogContext): boolean {
  if (entry.states && !entry.states.includes(ctx.stateCode)) return false;
  if (entry.sections) {
    if (!ctx.sectionId) return false;
    if (!entry.sections.includes(ctx.sectionId)) return false;
  }
  if (entry.offices && ctx.place && !entry.offices.includes(ctx.place.office)) return false;
  if (entry.placeIds) {
    if (!ctx.place) return false;
    if (!entry.placeIds.includes(ctx.place.id)) return false;
  }
  return true;
}

function matchesScope(entry: MoreSourceEntry, pageScope: MoreSourceScope, ctx: CatalogContext): boolean {
  if (entry.scope !== pageScope) return false;
  return matchesContext(entry, ctx);
}

function groupEntries(entries: MoreSourceEntry[]): MoreSourceGroups {
  const strip = entries.map(({ id: _id, scope: _s, states: _st, sections: _sec, offices: _o, placeIds: _p, ...link }) => link);
  const unique = new Map<string, MoreSourceLink>();
  for (const link of strip) {
    unique.set(`${link.org}:${link.href}`, link);
  }
  const links = [...unique.values()];

  return {
    office: links.filter((l) => l.org.startsWith('NWS') || l.org.includes('Mesonet') || l.org.includes('CoCoRaHS')),
    mountain: links.filter((l) => /WPC|NOHRSC|GOES|radar|Mountain|REC|MWOBS|avalanche/i.test(`${l.org} ${l.label}`)),
    land: links.filter((l) => /DEC|Forest|Park|NPS|GMC|USFS|Fire/i.test(`${l.org} ${l.label}`)),
    national: links.filter((l) => !/NWS|DEC|Forest|Park|NPS|GMC|USFS|Fire|WPC|NOHRSC|GOES|radar|Mountain|REC|MWOBS|avalanche|Mesonet|CoCoRaHS/i.test(`${l.org} ${l.label}`)),
  };
}

function select(pageScope: MoreSourceScope, ctx: CatalogContext): MoreSourceGroups {
  const matched = baseCatalog(ctx).filter((entry) => matchesScope(entry, pageScope, ctx));
  return groupEntries(matched);
}

export function moreSourcesForPlace(stateCode: MountainStateCode, sectionId: string, place: MountainPlace): MoreSourceGroups {
  const ctx = { stateCode, sectionId, place };
  const matched = baseCatalog(ctx).filter((entry) => matchesContext(entry, ctx));
  return groupEntries(matched);
}

export function moreSourcesForSection(stateCode: MountainStateCode, sectionId: string): MoreSourceGroups {
  return select('section', { stateCode, sectionId });
}

export function moreSourcesForState(stateCode: MountainStateCode): MoreSourceGroups {
  return select('state', { stateCode });
}

export function moreSourcesHasAny(groups: MoreSourceGroups): boolean {
  return Object.values(groups).some((list) => list.length > 0);
}
