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

const THRESHOLDS = [
  { id: 'ge01', label: '≥ 1 in' },
  { id: 'ge04', label: '≥ 4 in' },
  { id: 'ge08', label: '≥ 8 in' },
] as const;

function buildImages(cycle24: string | null): SnowImageAsset[] {
  const suffix24 = cycle24 ? cycle24.replace(/^(\d{10})f\d+$/, '$1f024') : 'latestf024';
  const images: SnowImageAsset[] = [];
  for (const t of THRESHOLDS) {
    images.push({
      id: `wpc-24h-${t.id}`,
      label: `Probabilistic 24h snow ${t.label}`,
      url: `https://www.wpc.ncep.noaa.gov/pwpf_24hr/prb_24hsnow_${t.id}_${suffix24.includes('latest') ? 'latestf024' : suffix24}.gif`,
      org: 'WPC',
      validTimeLabel: cycle24,
    });
    images.push({
      id: `wpc-48h-${t.id}`,
      label: `Probabilistic 48h snow ${t.label}`,
      url: `https://www.wpc.ncep.noaa.gov/pwpf_48hr/prb_48hsnow_${t.id}_latestf048.gif`,
      org: 'WPC',
      validTimeLabel: cycle24,
    });
  }
  return images;
}

async function load(): Promise<SourceResult<SnowImageAsset[]>> {
  const fetched = await fetchSourceBody(WPC_PWPF_SNOW_DEF.url);
  const base = buildSourceResult({
    fetched,
    parse: (text) => {
      const cycle = text.trim().split(/\r?\n/).find((l) => /^\d{10}f\d+$/.test(l.trim())) ?? null;
      return buildImages(cycle);
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