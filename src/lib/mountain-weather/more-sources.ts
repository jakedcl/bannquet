import type { MountainPlace } from '@/lib/mountain-weather/places';

export type MoreSourceLink = {
  label: string;
  href: string;
  org: string;
  mode: 'ui' | 'link';
};

const OFFICE_HUB: Record<string, string> = {
  BTV: 'https://www.weather.gov/btv',
  ALY: 'https://www.weather.gov/aly',
  GYX: 'https://www.weather.gov/gyx',
  CAR: 'https://www.weather.gov/car',
};

const STATE_FOR_OFFICE = { BTV: 'VT', ALY: 'NY', GYX: 'NH', CAR: 'ME' } as const;

function todayParts() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { y, m, day, iso: `${y}-${m}-${day}` };
}

function universalLinks(office: MountainPlace['office'], stateCode: string, lat: number, lon: number): MoreSourceLink[] {
  const { y, m, day, iso } = todayParts();
  const state = stateCode.toUpperCase();
  const cocorahs = `https://data.cocorahs.org/export/exportreports.aspx?ReportType=Daily&dtf=1&Format=CSV&State=${state}&ReportDateType=reportdate&Date=${m}/${day}/${y}&TimesInGMT=False`;
  const iem = `${state}_COOP`;
  return [
    { org: 'NWS', label: '7-day and hourly forecast (MapClick)', href: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`, mode: 'link' },
    { org: 'NWS', label: 'Active alerts API (point)', href: `https://api.weather.gov/alerts/active?point=${lat},${lon}`, mode: 'link' },
    { org: 'CoCoRaHS', label: `Daily reports (${state})`, href: cocorahs, mode: 'link' },
    { org: 'Iowa Environmental Mesonet', label: `COOP currents (${iem})`, href: `https://mesonet.agron.iastate.edu/api/1/currents.json?network=${iem}`, mode: 'link' },
    { org: 'NOHRSC', label: 'Station snow depth reports (Northeast)', href: `https://www.nohrsc.noaa.gov/nsa/reports.html?region=Northeast&var=snowdepth&dy=${y}&dm=${m}&dd=${day}&units=e&sort=value&filter=0`, mode: 'link' },
    { org: 'NERFC', label: 'NOHRSC modeled depth, SWE, melt', href: 'https://www.weather.gov/nerfc/snow', mode: 'link' },
    { org: 'NWS', label: 'Winter weather hub', href: `https://www.weather.gov/winter?sid=${office.toLowerCase()}`, mode: 'link' },
    { org: 'WPC', label: 'Winter Storm Severity Index', href: `https://www.wpc.ncep.noaa.gov/wwd/wssi/wssi.php?id=${office}`, mode: 'link' },
    { org: 'WPC', label: 'Probabilistic snowfall (days 1–3)', href: 'https://www.wpc.ncep.noaa.gov/pwpf/wwd_accum_probs.php', mode: 'link' },
    { org: 'WPC', label: 'Probabilistic snow, days 4–7', href: 'https://www.wpc.ncep.noaa.gov/wwd/pwpf_d47/pwpf_medr.php', mode: 'link' },
    { org: 'WPC', label: 'Winter storm outlook', href: `https://www.wpc.ncep.noaa.gov/wwd/wso/index.php?id=${office}`, mode: 'link' },
    { org: 'WPC', label: 'Winter weather hub', href: 'https://www.wpc.ncep.noaa.gov/wwd/winter_wx.shtml', mode: 'link' },
    { org: 'NWS', label: 'Northeast radar mosaic loop', href: 'https://radar.weather.gov/ridge/standard/NORTHEAST_loop.gif', mode: 'link' },
    { org: 'NOAA STAR', label: 'GOES-19 Northeast (GeoColor)', href: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/600x600.jpg', mode: 'link' },
    { org: 'NOAA STAR', label: 'GOES-19 GLM lightning (Northeast)', href: 'https://cdn.star.nesdis.noaa.gov/GOES19/GLM/SECTOR/ne/EXTENT3/latest.jpg', mode: 'link' },
    { org: 'US Naval Observatory', label: 'Sun, moon, twilight', href: `https://aa.usno.navy.mil/api/rstt/oneday?date=${iso}&coords=${lat},${lon}&tz=-5`, mode: 'link' },
    { org: 'EPA AirNow', label: 'Air quality (key needed for API)', href: 'https://www.airnow.gov/', mode: 'link' },
    { org: 'CPC', label: '6–10 and 8–14 day outlooks', href: 'https://www.cpc.ncep.noaa.gov/products/predictions/610day/', mode: 'link' },
    { org: 'SPC', label: 'Convective outlooks', href: 'https://www.spc.noaa.gov/products/outlook/', mode: 'link' },
    { org: 'NOAA', label: 'HRRR-Smoke (research)', href: 'https://rapidrefresh.noaa.gov/hrrr/HRRRsmoke/', mode: 'link' },
    { org: 'USFS', label: 'Wildland Fire Assessment System', href: 'https://www.wfas.net/', mode: 'link' },
    { org: 'NDMC', label: 'U.S. Drought Monitor', href: 'https://droughtmonitor.unl.edu/', mode: 'link' },
    { org: 'NOHRSC', label: 'Northeast snow analysis map', href: 'https://www.nohrsc.noaa.gov/nsa/index.html?region=Northeast', mode: 'link' },
    { org: 'NERFC', label: 'River ice thickness (modeled)', href: 'https://www.weather.gov/images/nerfc/ops/ice_thickness_today.png', mode: 'link' },
    { org: 'NWS', label: 'How to read probabilistic snow', href: 'https://www.weather.gov/prob-snow', mode: 'link' },
    { org: 'NCEI', label: 'Climate Data Online', href: 'https://www.ncei.noaa.gov/cdo-web/', mode: 'link' },
    { org: 'NWS Air Quality', label: 'Forecast guidance', href: 'https://airquality.weather.gov/', mode: 'link' },
  ];
}

function officeProductLinks(office: MountainPlace['office']): MoreSourceLink[] {
  const low = office.toLowerCase();
  const sftState = STATE_FOR_OFFICE[office];
  return [
    { org: `NWS ${office}`, label: 'Office homepage', href: OFFICE_HUB[office], mode: 'link' },
    { org: `NWS ${office}`, label: 'Zone Forecast (ZFP)', href: `https://api.weather.gov/products/types/ZFP/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Area Forecast Discussion (AFD)', href: `https://api.weather.gov/products/types/AFD/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Point Forecast Matrix (PFM)', href: `https://api.weather.gov/products/types/PFM/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Area Forecast Matrix (AFM)', href: `https://api.weather.gov/products/types/AFM/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Fire Weather (FWF)', href: `https://api.weather.gov/products/types/FWF/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Hydrologic summary (HYD)', href: `https://api.weather.gov/products/types/HYD/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Public Information Statement storm totals (PNS)', href: `https://api.weather.gov/products/types/PNS/locations/${office}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Observations hub', href: `https://www.weather.gov/${low}/observations`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Climate pages', href: `https://www.weather.gov/${low}/climate`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Recreation', href: `https://www.weather.gov/${low}/recreation`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Text product index', href: `https://www.weather.gov/${low}/textProds`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Tabular State Forecast (SFT)', href: `https://api.weather.gov/products/types/SFT/locations/${sftState}/latest`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Fire weather images', href: `https://www.weather.gov/${low}/firewx`, mode: 'link' },
    { org: `NWS ${office}`, label: 'Graphical Hazardous Weather Outlook', href: `https://www.weather.gov/erh/ghwo?wfo=${low}`, mode: 'link' },
    { org: `NWS ${office}`, label: 'River and hydro', href: `https://water.noaa.gov/wfo/${low}`, mode: 'link' },
  ];
}

function regionalLinks(stateCode: string, place: MountainPlace): MoreSourceLink[] {
  const links: MoreSourceLink[] = [];
  if (stateCode === 'ny') {
    links.push(
      { org: 'NY DEC', label: 'Adirondack backcountry information', href: 'https://dec.ny.gov/things-to-do/hiking/adirondack-backcountry-information', mode: 'link' },
      { org: 'NY DEC', label: 'Fire danger map', href: 'https://dec.ny.gov/environmental-protection/wildfires/fire-danger-map', mode: 'link' },
      { org: 'NY DEC', label: 'Catskill backcountry information', href: 'https://dec.ny.gov/things-to-do/hiking/catskill-backcountry-information', mode: 'link' },
      { org: 'NYS Mesonet', label: 'Mesonet (personal use; link only)', href: 'https://www.nysmesonet.org/', mode: 'link' },
      { org: 'NY DEC', label: 'Adirondack avalanche (NYSAC)', href: 'https://www.dec.ny.gov/things-to-do/hiking/adirondack-avalanche', mode: 'link' },
    );
    if (/whiteface/i.test(place.name)) {
      links.push({ org: 'UAlbany ASRC', label: 'Whiteface timelapse', href: 'https://www.albany.edu/asrc/', mode: 'link' });
    }
  }
  if (stateCode === 'vt') {
    links.push(
      { org: 'Green Mountain Club', label: 'Trail conditions and notices', href: 'https://greenmountainclub.org/', mode: 'link' },
      { org: 'Green Mountain National Forest', label: 'Alerts', href: 'https://www.fs.usda.gov/r09/gmfl/alerts', mode: 'link' },
    );
  }
  if (stateCode === 'nh') {
    links.push(
      { org: 'White Mountain National Forest', label: 'Forest alerts', href: 'https://www.fs.usda.gov/whitemountain', mode: 'link' },
      { org: 'MWOBS', label: 'Higher Summits Forecast (link only)', href: 'https://mountwashington.org/weather/higher-summits-forecast/', mode: 'link' },
      { org: 'MWOBS', label: 'Summit webcams', href: 'https://mountwashington.org/webcams/', mode: 'link' },
      { org: 'MWAC', label: 'Avalanche center map layer', href: 'https://api.avalanche.org/2/public/products/map-layer/MWAC', mode: 'link' },
    );
  }
  if (stateCode === 'me') {
    links.push(
      { org: 'Baxter State Park', label: 'Conditions report', href: 'https://baxterstatepark.org/conditions-report/', mode: 'link' },
      { org: 'NPS', label: 'Acadia conditions', href: 'https://www.nps.gov/acad/planyourvisit/conditions.htm', mode: 'link' },
      { org: 'NWS Caribou', label: 'Baxter graphics', href: 'https://www.weather.gov/car/baxter', mode: 'link' },
      { org: 'NWS Caribou', label: 'Acadia graphics', href: 'https://www.weather.gov/car/acadia', mode: 'link' },
    );
  }
  return links;
}

export function moreSourcesForPlace(
  stateCode: string,
  place: MountainPlace,
): Record<'office' | 'mountain' | 'land' | 'national', MoreSourceLink[]> {
  const universal = universalLinks(place.office, stateCode, place.lat, place.lon);
  const office = officeProductLinks(place.office);
  const land = regionalLinks(stateCode, place);
  const mountain: MoreSourceLink[] = [];
  if (place.office === 'BTV' || place.office === 'ALY') {
    mountain.push({
      org: `NWS ${place.office}`,
      label: 'Mountain forecast viewer',
      href: `https://www.weather.gov/${place.office.toLowerCase()}/mountain`,
      mode: 'link',
    });
  }
  if (place.id === 'mt-washington' || place.id === 'mount-adams') {
    mountain.push(
      { org: 'NWS Gray', label: 'REC (Summits above 4,000 ft)', href: 'https://api.weather.gov/products/types/REC/locations/GYX/latest', mode: 'link' },
      { org: 'NWS Gray', label: 'Mount Washington (allLocations)', href: 'https://www.weather.gov/source/gyx/rec/allLocations.xml', mode: 'link' },
    );
  }
  return {
    office: [...office, ...universal.filter((l) => l.org.startsWith('NWS'))],
    mountain: [...mountain, ...universal.filter((l) => /WPC|NOHRSC|GOES|radar/i.test(l.label))],
    land,
    national: universal.filter((l) => !/NWS|rader|GOES/i.test(l.org) || l.org === 'WPC'),
  };
}
