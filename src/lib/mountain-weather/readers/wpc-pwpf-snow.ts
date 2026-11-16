import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { SnowImageAsset } from '@/lib/mountain-weather/snow-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const WPC_PWPF_SNOW_DEF: SourceDef = {
  id: 'wpc-pwpf-prob-snow',
  org: 'Weather Prediction Center',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.wpc.ncep.noaa.gov/pwpf/displayfiles_prb_snow_24hr.txt',
  ttlSeconds: 3600,
  expectedEveryHours: 6,
  season: 'winter',
};

const WPC_48H_CYCLES_URL = 'https://www.wpc.ncep.noaa.gov/pwpf/displayfiles_prb_snow_48hr.txt';
export const WPC_SNOW_PAGE_URL = 'https://www.wpc.ncep.noaa.gov/pwpf/wwd_percentiles_new.php';

const THRESHOLDS = [
  { id: 'ge01', label: '≥ 1 in' },
  { id: 'ge04', label: '≥ 4 in' },
  { id: 'ge08', label: '≥ 8 in' },
] as const;

export function firstWpcCycle(text: string, leadHours: number): string | null {
  return text.match(/\b\d{10}f\d{3}\b/g)?.find((token) => Number(token.slice(-3)) === leadHours) ?? null;
}

function validWindow(cycle: string | null, durationHours: number): string | null {
  if (!cycle) return null;
  const start = new Date(`${cycle.slice(0, 4)}-${cycle.slice(4, 6)}-${cycle.slice(6, 8)}T${cycle.slice(8, 10)}:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + Number(cycle.slice(-3)) * 3600000);
  const begin = new Date(end.getTime() - durationHours * 3600000);
  const fmt = (date: Date) => date.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', timeZoneName: 'short' });
  return `${fmt(begin)} – ${fmt(end)}`;
}

function currentCycle(cycle: string | null): boolean {
  if (!cycle) return false;
  const issued = Date.parse(`${cycle.slice(0, 4)}-${cycle.slice(4, 6)}-${cycle.slice(6, 8)}T${cycle.slice(8, 10)}:00:00Z`);
  return Number.isFinite(issued) && issued <= Date.now() + 6 * 3600000 && issued >= Date.now() - 48 * 3600000;
}

function buildImages(cycle24: string | null, cycle48: string | null): SnowImageAsset[] {
  const images: SnowImageAsset[] = [];
  for (const t of THRESHOLDS) {
    if (currentCycle(cycle24)) images.push({
      id: `wpc-24h-${t.id}`,
      label: `Probabilistic 24h snow ${t.label}`,
      url: `https://www.wpc.ncep.noaa.gov/pwpf_24hr/prb_24hsnow_${t.id}_${cycle24}.gif`,
      org: 'WPC',
      validTimeLabel: validWindow(cycle24, 24),
    });
    if (currentCycle(cycle48)) images.push({
      id: `wpc-48h-${t.id}`,
      label: `Probabilistic 48h snow ${t.label}`,
      url: `https://www.wpc.ncep.noaa.gov/pwpf_48hr/prb_48hsnow_${t.id}_${cycle48}.gif`,
      org: 'WPC',
      validTimeLabel: validWindow(cycle48, 48),
    });
  }
  return images;
}

async function load(): Promise<SourceResult<SnowImageAsset[]>> {
  const [fetched, fetched48] = await Promise.all([fetchSourceBody(WPC_PWPF_SNOW_DEF.url), fetchSourceBody(WPC_48H_CYCLES_URL)]);
  const base = buildSourceResult({
    fetched,
    parse: (text) => {
      const cycle24 = firstWpcCycle(text, 24);
      const cycle48 = fetched48.ok ? firstWpcCycle(fetched48.text, 48) : null;
      return buildImages(cycle24, cycle48);
    },
  });
  return base;
}

const readCached = cachedSourceRead({
  cacheKey: [WPC_PWPF_SNOW_DEF.id],
  def: WPC_PWPF_SNOW_DEF,
  read: load,
});

export function readWpcProbSnowImages(): Promise<SourceResult<SnowImageAsset[]>> {
  return readCached();
}

export function wssiUrlForOffice(office: string): string {
  return `https://www.wpc.ncep.noaa.gov/wwd/wssi/wssi.php?id=${office.toLowerCase()}`;
}

export function nwsWinterPageUrl(office: string): string {
  return `https://www.weather.gov/winter?sid=${office.toLowerCase()}`;
}
