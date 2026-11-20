import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { moreSourcesForPlace, type MoreSourceLink } from '@/lib/mountain-weather/more-sources';
import { bulletinOfficeForPlace } from '@/lib/mountain-weather/bulletin-bindings';
import { afdSourceDef } from '@/lib/mountain-weather/nws-office';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import {
  NWS_ALL_LOCATIONS_CAR_DEF,
  NWS_ALL_LOCATIONS_GYX_DEF,
  NWS_AVG_BTV_DEF,
  NWS_AVG_GYX_DEF,
  NWS_BTV_BALLOON_DEF,
  NWS_GRID_BASELINE_DEF,
  NWS_HWO_BTV_DEF,
  NWS_MTN_ALY_ENHANCED_DEF,
  NWS_MTN_BTV_ENHANCED_DEF,
  NWS_REC_ALY_DEF,
  NWS_REC_BTV_DEF,
  NWS_REC_CAR_DEF,
  NWS_REC_GYX_DEF,
} from '@/lib/mountain-weather/registry';
import { mansfieldPackSourceDefs, readMansfieldPack } from '@/lib/mountain-weather/read-mansfield-pack';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import { readPlaceAvalanche } from '@/lib/mountain-weather/read-place-avalanche';
import { readPlaceSky } from '@/lib/mountain-weather/read-place-sky';
import { readMtnPointForPlace } from '@/lib/mountain-weather/read-mtn-point';
import { readAllLocationsForPlace, readRecForPlace } from '@/lib/mountain-weather/read-place-rec';
import { readBalloonForPlace } from '@/lib/mountain-weather/read-place-balloon';
import { readOfficeBulletins } from '@/lib/mountain-weather/read-office-bulletins';
import { readPlaceObservations } from '@/lib/mountain-weather/read-place-observations';
import { readPlaceGround } from '@/lib/mountain-weather/read-place-ground';
import { readAvgForPlace } from '@/lib/mountain-weather/read-place-avg';
import { readPlaceSnow } from '@/lib/mountain-weather/read-place-snow';
import { readPlaceMaps } from '@/lib/mountain-weather/read-place-maps';
import { AVALANCHE_MAP_LAYER_MWAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-mwac';
import { AVALANCHE_MAP_LAYER_NYSAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-nysac';
import { COMPASS_NE_ESS_DEF } from '@/lib/mountain-weather/readers/compass-ne-ess';
import { USDM_COUNTY_DROUGHT_DEF } from '@/lib/mountain-weather/readers/usdm-county-drought';
import { USNO_RSTT_ONEDAY_DEF } from '@/lib/mountain-weather/readers/usno-rstt-oneday';
import { WPC_PWPF_SNOW_DEF, WPC_SNOW_PAGE_URL } from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import { NOHRSC_NE_INDEX_DEF } from '@/lib/mountain-weather/readers/nohrsc-northeast-images';
import { NERFC_SNOW_OPS_DEF } from '@/lib/mountain-weather/readers/nerfc-snow-ops';
import { NOHRSC_STATION_SNOWDEPTH_DEF } from '@/lib/mountain-weather/readers/nohrsc-station-snowdepth';
import { nwsPnsSourceDef } from '@/lib/mountain-weather/readers/nws-pns-latest';
import { iemLsrSnowSourceDef } from '@/lib/mountain-weather/readers/iem-lsr-snow';
import { NWS_RIDGE_NE_MOSAIC_DEF } from '@/lib/mountain-weather/readers/nws-ridge-radar';
import { GOES19_NE_GEOCOLOR_DEF } from '@/lib/mountain-weather/readers/goes-19-ne';
import { NWS_ALERTS_ACTIVE_NE_DEF } from '@/lib/mountain-weather/readers/nws-alerts-active-ne';
import { SPC_CONVECTIVE_OUTLOOK_DEF } from '@/lib/mountain-weather/readers/spc-convective-outlook';

/*
 * "Sources for this page": every source a place page reads, once, with whether it is
 * working right now. All readers are the cached ones the tabs use, so this mostly reads
 * the same cache entries the tabs filled.
 */

export type PageSourceTab = 'forecast' | 'measured' | 'snow' | 'maps' | 'more';

export type PageSourceRow = {
  key: string;
  tab: PageSourceTab;
  /** What it is, in plain words. */
  name: string;
  /** Official product name. */
  product: string | null;
  org: string;
  /** SourceResult status, or 'empty' when the source has nothing published for this place now. */
  status: string;
  at: string | null;
  expectedEveryHours?: number;
  href: string;
};

export type PageSources = {
  rows: PageSourceRow[];
  /** Useful pages the site links to but does not read. */
  links: MoreSourceLink[];
};

const OFFICE_ORG: Record<string, string> = {
  BTV: 'National Weather Service Burlington',
  ALY: 'National Weather Service Albany',
  GYX: 'National Weather Service Gray',
  CAR: 'National Weather Service Caribou',
  BOX: 'National Weather Service Boston',
  OKX: 'National Weather Service New York',
};

const REC_DEF = { BTV: NWS_REC_BTV_DEF, ALY: NWS_REC_ALY_DEF, GYX: NWS_REC_GYX_DEF, CAR: NWS_REC_CAR_DEF } as const;
const ALL_LOCATIONS_DEF = { GYX: NWS_ALL_LOCATIONS_GYX_DEF, CAR: NWS_ALL_LOCATIONS_CAR_DEF } as const;
const AVG_DEF = { BTV: NWS_AVG_BTV_DEF, GYX: NWS_AVG_GYX_DEF } as const;
const CENTER_DEF = { MWAC: AVALANCHE_MAP_LAYER_MWAC_DEF, NYSAC: AVALANCHE_MAP_LAYER_NYSAC_DEF } as const;

function fromResult(
  tab: PageSourceTab,
  key: string,
  name: string,
  product: string | null,
  org: string,
  result: SourceResult<unknown> | null | undefined,
  fallbackHref: string,
  expectedEveryHours?: number,
): PageSourceRow | null {
  if (!result) return null;
  return {
    key,
    tab,
    name,
    product,
    org,
    status: result.status,
    at: result.issuedAt,
    expectedEveryHours,
    href: result.sourceUrl || fallbackHref,
  };
}

function fixed(
  tab: PageSourceTab,
  key: string,
  name: string,
  product: string | null,
  org: string,
  present: boolean,
  href: string,
  at: string | null = null,
): PageSourceRow {
  return { key, tab, name, product, org, status: present ? 'ok' : 'empty', at, href };
}

/** Product codes in parentheses, e.g. "(AFD)", so link-only rows don't repeat a shown product. */
function productCodes(text: string | null): string[] {
  const t = text ?? '';
  const lead = t.match(/^([A-Z]{3,4})\b/);
  return [...t.matchAll(/\(([A-Z0-9]{2,5})\)/g)].map((m) => m[1]).concat(lead ? [lead[1]] : []);
}

/** "PRESIDENTIAL RANGE FORECAST AREA" -> "Presidential Range Forecast Area"; mixed case is left alone. */
export function tidyLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (/[a-z]/.test(t)) return t;
  return t.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bFt\b/g, 'ft');
}

/** "Mid-elevation band (2,500–4,000 ft; GYX labels this Mount Adams)" -> "2,500–4,000 ft". */
function bandLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.match(/[\d,]+\s*[–-]\s*[\d,]+\s*ft/)?.[0] ?? tidyLabel(text);
}

export async function readPageSources(
  place: MountainPlace,
  stateCode: MountainStateCode,
  sectionId: string,
): Promise<PageSources> {
  const office = bulletinOfficeForPlace(place.id)?.office ?? null;
  const [baseline, avalanche, sky, mtnPoint, rec, allLocations, balloon, bulletins, pack, observations, ground, snow, maps] =
    await Promise.all([
      readNwsGridBaseline(place),
      readPlaceAvalanche(place.id),
      readPlaceSky(place),
      readMtnPointForPlace(place.id),
      readRecForPlace(place.id),
      readAllLocationsForPlace(place.id),
      readBalloonForPlace(place.id),
      office ? readOfficeBulletins(office) : Promise.resolve(null),
      readMansfieldPack(place.id),
      readPlaceObservations(place.id),
      readPlaceGround(place, stateCode, sectionId),
      readPlaceSnow(place),
      readPlaceMaps(place, { state: stateCode, sectionId }),
    ]);
  const avg = avalanche?.avg ?? (await readAvgForPlace(place.id));

  const rows: (PageSourceRow | null)[] = [];

  // Forecast tab
  rows.push(
    fromResult('forecast', 'grid', 'Forecast for this spot: now, 48 hours, 7 days', 'Gridpoint forecast', NWS_GRID_BASELINE_DEF.org, baseline, NWS_GRID_BASELINE_DEF.url, NWS_GRID_BASELINE_DEF.expectedEveryHours),
  );
  if (mtnPoint) {
    const org = mtnPoint.data?.office === 'ALY' ? NWS_MTN_ALY_ENHANCED_DEF.org : NWS_MTN_BTV_ENHANCED_DEF.org;
    rows.push(fromResult('forecast', 'mtn', 'Mountain forecast, hour by hour', 'Mountain Point Forecast', org, mtnPoint, NWS_MTN_BTV_ENHANCED_DEF.url, 6));
  }
  for (const [i, r] of (rec ?? []).entries()) {
    const off = r.data?.office ?? place.office;
    const def = REC_DEF[off as keyof typeof REC_DEF];
    rows.push(
      fromResult('forecast', `rec-${i}`, `Forecaster's mountain forecast${bandLabel(r.data?.nearbyLabel) ? `, ${bandLabel(r.data?.nearbyLabel)}` : ''}`, 'Recreation Forecast (REC)', def?.org ?? OFFICE_ORG[off] ?? 'National Weather Service', r, def?.url ?? '', def?.expectedEveryHours),
    );
  }
  for (const [i, r] of (allLocations ?? []).entries()) {
    const off = r.data?.office ?? place.office;
    const def = ALL_LOCATIONS_DEF[off as keyof typeof ALL_LOCATIONS_DEF];
    rows.push(fromResult('forecast', `all-${i}`, `Forecaster's mountain forecast, map file${r.data?.loc ? `: ${tidyLabel(r.data.loc)}` : ''}`, 'allLocations', def?.org ?? OFFICE_ORG[off] ?? 'National Weather Service', r, def?.url ?? '', def?.expectedEveryHours));
  }
  if (balloon) rows.push(fromResult('forecast', 'balloon', 'Winds aloft', 'Hot Air Balloon Forecast', NWS_BTV_BALLOON_DEF.org, balloon, NWS_BTV_BALLOON_DEF.url, NWS_BTV_BALLOON_DEF.expectedEveryHours));
  if (bulletins) {
    const afdDef = afdSourceDef(bulletins.office as MountainWfo);
    rows.push(fromResult('forecast', 'afd', 'What the forecasters are thinking', 'Area Forecast Discussion (AFD)', afdDef.org, bulletins.afd, afdDef.url, afdDef.expectedEveryHours));
    if (bulletins.hwo) rows.push(fromResult('forecast', 'hwo', 'Hazards in the coming week', 'Hazardous Weather Outlook (HWO)', NWS_HWO_BTV_DEF.org, bulletins.hwo, NWS_HWO_BTV_DEF.url, NWS_HWO_BTV_DEF.expectedEveryHours));
  }
  if (pack) {
    const defs = Object.fromEntries(mansfieldPackSourceDefs().map((s) => [s.key, s.def]));
    rows.push(fromResult('forecast', 'mmn-profile', 'Elevation profile', 'Worked out from the Mountain Point Forecast', defs.profile.org, pack.profile, defs.profile.url, defs.profile.expectedEveryHours));
    rows.push(fromResult('measured', 'mmn-rr2', 'Mansfield summit temperature', 'Summit report (RR2, SHEF)', defs.rr2Summit.org, pack.rr2Summit, defs.rr2Summit.url, defs.rr2Summit.expectedEveryHours));
    rows.push(fromResult('measured', 'mmn-station', 'Mansfield summit station', 'Station observations · MMNV1', defs.station.org, pack.station, defs.station.url, defs.station.expectedEveryHours));
    rows.push(fromResult('snow', 'mmn-hyd', 'Mansfield snow stake', 'Hydrologic Summary (HYD)', defs.hyd.org, pack.hyd, defs.hyd.url, defs.hyd.expectedEveryHours));
    rows.push(fromResult('snow', 'mmn-clim', 'Mansfield snow depth record', null, defs.climatology.org, pack.climatology, defs.climatology.url, defs.climatology.expectedEveryHours));
  }

  // Measured tab
  for (const block of observations?.stations ?? []) {
    const where = block.binding.kind === 'summit' ? 'Summit' : block.binding.kind === 'valley' ? 'Valley' : 'Nearby';
    rows.push({
      ...fromResult('measured', `stn-${block.binding.stationId}`, `${where} station: ${block.binding.stationName ?? block.binding.stationId}`, `Station observations · ${block.binding.stationId}`, block.def.org, block.result, block.def.url, block.def.expectedEveryHours)!,
      at: block.result.data?.timestamp ?? block.result.issuedAt,
    });
  }
  if (observations?.asrc) rows.push(fromResult('measured', 'asrc', 'Whiteface summit timelapse', null, 'University at Albany ASRC', observations.asrc, ''));
  rows.push({
    ...fromResult('measured', 'compass', 'Nearest road weather station', 'Road weather stations (ESS)', COMPASS_NE_ESS_DEF.org, ground.compassEss, COMPASS_NE_ESS_DEF.url)!,
    status: ground.compassEss.status === 'ok' && !ground.compassEss.data ? 'empty' : ground.compassEss.status,
    at: ground.compassEss.data?.observedAt ?? null,
  });

  // Snow tab
  for (const center of avalanche?.centers ?? []) {
    const id = (center.data?.centerId ?? 'MWAC') as keyof typeof CENTER_DEF;
    const def = CENTER_DEF[id] ?? AVALANCHE_MAP_LAYER_MWAC_DEF;
    rows.push(fromResult('snow', `avy-${id}`, 'Avalanche forecast', `${id} map layer and product`, def.org, center, def.url));
  }
  for (const [i, r] of (avg ?? []).entries()) {
    const off = r.data?.office ?? place.office;
    const def = AVG_DEF[off as keyof typeof AVG_DEF];
    rows.push(fromResult('snow', `avg-${i}`, `Avalanche weather, hour by hour${r.data?.point.title ? `: ${tidyLabel(r.data.point.title)}` : ''}`, 'Avalanche Weather Guidance (AVG)', def?.org ?? OFFICE_ORG[off] ?? 'National Weather Service', r, def?.url ?? '', def?.expectedEveryHours));
  }
  const pnsDef = nwsPnsSourceDef(snow.office);
  const lsrDef = iemLsrSnowSourceDef(snow.office);
  rows.push(
    fixed('snow', 'wpc', 'Chance of snow maps', 'WPC Probabilistic Snowfall (PWPF)', WPC_PWPF_SNOW_DEF.org, snow.wpcImages.length > 0, WPC_SNOW_PAGE_URL),
    fixed('snow', 'nohrsc', 'Snow cover maps (model)', 'NOHRSC modeled depth, SWE, melt', NOHRSC_NE_INDEX_DEF.org, snow.nohrscImages.length > 0, NOHRSC_NE_INDEX_DEF.url),
    fixed('snow', 'nerfc', 'Snow cover maps (river forecast center)', 'NERFC composites', NERFC_SNOW_OPS_DEF.org, snow.nerfcImages.length > 0, NERFC_SNOW_OPS_DEF.url),
    fixed('snow', 'depth', 'Snow on the ground nearby', 'Station snow depth table (NOHRSC, CoCoRaHS)', NOHRSC_STATION_SNOWDEPTH_DEF.org, snow.measured.some((m) => m.value !== null), NOHRSC_STATION_SNOWDEPTH_DEF.url),
    fixed('snow', 'pns', 'Office storm bulletin', 'Public Information Statement (PNS)', pnsDef.org, Boolean(snow.pns), pnsDef.url, snow.pns?.issuanceTime ?? null),
    fixed('snow', 'lsr', 'Recent snowfall reports', 'Local Storm Reports (LSR)', lsrDef.org, snow.lsrSnow.length > 0, lsrDef.url),
  );

  // Maps tab
  rows.push(
    fixed('maps', 'radar', 'Radar', 'NWS RIDGE loops', NWS_RIDGE_NE_MOSAIC_DEF.org, Boolean(maps.radarMosaic || maps.radarSite), NWS_RIDGE_NE_MOSAIC_DEF.url),
    fixed('maps', 'satellite', 'Satellite and lightning', 'GOES-19 GeoColor and GLM', GOES19_NE_GEOCOLOR_DEF.org, Boolean(maps.goesColor || maps.goesGlm), GOES19_NE_GEOCOLOR_DEF.url),
  );
  rows.push(fromResult('maps', 'alerts', 'Weather alerts', 'Active alerts', NWS_ALERTS_ACTIVE_NE_DEF.org, maps.alerts, NWS_ALERTS_ACTIVE_NE_DEF.url));
  rows.push(fixed('maps', 'spc', 'Thunderstorm outlooks', 'SPC convective outlooks', SPC_CONVECTIVE_OUTLOOK_DEF.org, maps.spcImages.length > 0, SPC_CONVECTIVE_OUTLOOK_DEF.url));

  // More tab
  rows.push(fromResult('more', 'usno', 'Sun and moon', 'Sun and moon data (RSTT)', USNO_RSTT_ONEDAY_DEF.org, sky.bundle, USNO_RSTT_ONEDAY_DEF.url));
  rows.push({
    ...fromResult('more', 'drought', 'County drought', 'U.S. Drought Monitor', USDM_COUNTY_DROUGHT_DEF.org, ground.drought, USDM_COUNTY_DROUGHT_DEF.url, USDM_COUNTY_DROUGHT_DEF.expectedEveryHours)!,
    status: ground.drought.status === 'ok' && !ground.drought.data ? 'empty' : ground.drought.status,
  });

  const shown = rows.filter((r): r is PageSourceRow => r !== null);

  // Links the page doesn't read: drop anything already listed above (same address or same
  // product code, e.g. the AFD link when the AFD is shown), one row per address.
  const shownHrefs = new Set(shown.map((r) => r.href));
  const shownCodes = new Set(shown.flatMap((r) => productCodes(r.product)));
  const seen = new Set<string>();
  const links = Object.values(moreSourcesForPlace(stateCode, sectionId, place))
    .flat()
    .filter((l) => {
      // 'ui' entries are sources the page reads; they are already rows above.
      if (l.mode === 'ui') return false;
      if (shownHrefs.has(l.href) || seen.has(l.href)) return false;
      if (productCodes(l.label).some((code) => shownCodes.has(code))) return false;
      seen.add(l.href);
      return true;
    });

  return { rows: shown, links };
}
