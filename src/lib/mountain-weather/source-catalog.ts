import { SOURCE_REGISTRY } from '@/lib/mountain-weather/registry';
import { GROUND_ACCESS_NOTES } from '@/lib/mountain-weather/read-place-ground';
import { USNO_API_TWILIGHT_NOTE } from '@/lib/mountain-weather/read-place-sky';
import type { SourceDef } from '@/lib/mountain-weather/source-types';

/** What each feed is, in plain words, and which tab shows it. Missing ids fall back to the registry id. */
const PLAIN: Record<string, { name: string; tab: string }> = {
  'nws-grid-baseline': { name: 'Forecast for each spot: now, 48 hours, 7 days', tab: 'Forecast' },
  'nws-btv-mtn-enhanced': { name: 'Mountain forecast, hour by hour (Burlington)', tab: 'Forecast' },
  'nws-btv-mtn-standard': { name: 'Mountain forecast, standard table (Burlington)', tab: 'Forecast' },
  'nws-aly-mtn-enhanced': { name: 'Mountain forecast, hour by hour (Albany)', tab: 'Forecast' },
  'nws-aly-mtn-standard': { name: 'Mountain forecast, standard table (Albany)', tab: 'Forecast' },
  'nws-btv-rec': { name: "Forecaster's mountain forecast (Burlington)", tab: 'Forecast' },
  'nws-aly-rec': { name: "Forecaster's mountain forecast (Albany)", tab: 'Forecast' },
  'nws-gyx-rec': { name: "Forecaster's mountain forecast (Gray)", tab: 'Forecast' },
  'nws-car-rec': { name: "Forecaster's mountain forecast (Caribou)", tab: 'Forecast' },
  'nws-btv-balloon': { name: 'Winds aloft (Burlington)', tab: 'Forecast' },
  'nws-btv-afd': { name: 'What the forecasters are thinking (Burlington)', tab: 'Forecast' },
  'nws-aly-afd': { name: 'What the forecasters are thinking (Albany)', tab: 'Forecast' },
  'nws-gyx-afd': { name: 'What the forecasters are thinking (Gray)', tab: 'Forecast' },
  'nws-car-afd': { name: 'What the forecasters are thinking (Caribou)', tab: 'Forecast' },
  'nws-btv-hwo': { name: 'Hazards in the coming week (Burlington)', tab: 'Forecast' },
  'nws-aly-fzl': { name: 'Freezing level (not shown on the site; link only)', tab: 'More' },
  'nws-gyx-fzl': { name: 'Freezing level (not shown on the site; link only)', tab: 'More' },
  'nws-gyx-all-locations': { name: "Forecaster's mountain forecast, map file (Gray)", tab: 'Forecast' },
  'nws-car-all-locations': { name: "Forecaster's mountain forecast, map file (Caribou)", tab: 'Forecast' },
  'nws-btv-avg': { name: 'Avalanche weather, hour by hour (Burlington)', tab: 'Snow' },
  'nws-gyx-avg': { name: 'Avalanche weather, hour by hour (Gray)', tab: 'Snow' },
  'avalanche-map-layer-mwac': { name: 'Avalanche forecast: Mount Washington', tab: 'Snow' },
  'avalanche-map-layer-nysac': { name: 'Avalanche forecast: Adirondacks', tab: 'Snow' },
  'wpc-pwpf-prob-snow': { name: 'Chance of snow maps', tab: 'Snow' },
  'nohrsc-northeast-index': { name: 'Snow cover maps (model)', tab: 'Snow' },
  'nerfc-snow-ops-images': { name: 'Snow cover maps (river forecast center)', tab: 'Snow' },
  'nohrsc-station-snowdepth-ne': { name: 'Snow on the ground nearby', tab: 'Snow' },
  'nws-btv-mansfield-hyd': { name: 'Mansfield snow stake', tab: 'Snow' },
  'nws-btv-mmn-snow-climatology': { name: 'Mansfield snow depth record', tab: 'Snow' },
  'nws-btv-mansfield-profile': { name: 'Mansfield elevation profile', tab: 'Forecast' },
  'nws-btv-rr2': { name: 'Mansfield summit temperature', tab: 'Measured' },
  'nws-station-mmnv1': { name: 'Mansfield summit station', tab: 'Measured' },
  'uasrc-whiteface-timelapse': { name: 'Whiteface summit camera', tab: 'Measured' },
  'compass-ne-ess': { name: 'Road weather stations', tab: 'Measured' },
  'airnow-aqi': { name: 'Air quality (link only on the site)', tab: 'Measured' },
  'nws-ridge-ne-mosaic': { name: 'Radar', tab: 'Maps' },
  'goes19-ne-geocolor': { name: 'Satellite', tab: 'Maps' },
  'goes19-ne-glm': { name: 'Lightning from space', tab: 'Maps' },
  'nws-alerts-active-ne': { name: 'Weather alerts', tab: 'Maps' },
  'spc-convective-outlook': { name: 'Thunderstorm outlooks', tab: 'Maps' },
  'nws-zone-geojson': { name: 'Alert zone shapes for the map', tab: 'Maps' },
  'usno-rstt-oneday': { name: 'Sun and moon', tab: 'More' },
  'usdm-county-drought': { name: 'County drought', tab: 'More' },
};

export type SourceCatalogRow = {
  id: string;
  name: string;
  tab: string;
  org: string;
  every: string;
  terms: string;
  url: string;
};

const TERMS: Record<SourceDef['terms'], string> = {
  'reuse-ok': 'Free to reuse',
  'link-only': 'Link only',
  'ask-first': 'Ask before reusing',
  'key-needed': 'Needs a key',
};

function every(def: SourceDef): string {
  const h = def.expectedEveryHours;
  if (!h) return 'As published';
  if (h < 1) return `Every ${Math.round(h * 60)} min`;
  return h === 1 ? 'Hourly' : `About every ${h} hours`;
}

export function sourceCatalog(): { rows: SourceCatalogRow[]; stationCount: number; notes: string[] } {
  const rows: SourceCatalogRow[] = [];
  let stationCount = 0;
  for (const [id, def] of Object.entries(SOURCE_REGISTRY)) {
    if (id.startsWith('nws-station-') && id !== 'nws-station-mmnv1') {
      stationCount += 1;
      continue;
    }
    const plain = PLAIN[id];
    rows.push({ id, name: plain?.name ?? id, tab: plain?.tab ?? 'Other', org: def.org, every: every(def), terms: TERMS[def.terms], url: def.url });
  }
  const tabOrder = ['Forecast', 'Measured', 'Snow', 'Maps', 'More', 'Other'];
  rows.sort((a, b) => tabOrder.indexOf(a.tab) - tabOrder.indexOf(b.tab) || a.name.localeCompare(b.name));
  const notes = [
    'Weather station readings come from the National Weather Service. We read the last few reports for each station, because the "latest" report drops any value that failed a quality check.',
    'Road weather stations older than 6 hours are skipped.',
    GROUND_ACCESS_NOTES.dec,
    GROUND_ACCESS_NOTES.baxter,
    GROUND_ACCESS_NOTES.fire,
    GROUND_ACCESS_NOTES.compassCameras,
    'Air quality is a link to AirNow.gov; the site has no AirNow key.',
    USNO_API_TWILIGHT_NOTE,
    'Whiteface\'s summit camera works, but the Whiteface weather data feeds (University at Albany) were not available when last checked.',
    'WPC snow maps load in real browsers but are blocked for automated test tools, so screenshot checks show them as unavailable.',
  ];
  return { rows, stationCount, notes };
}
