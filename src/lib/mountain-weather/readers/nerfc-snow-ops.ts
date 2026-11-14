import type { SnowImageAsset } from '@/lib/mountain-weather/snow-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const NERFC_SNOW_OPS_DEF: SourceDef = {
  id: 'nerfc-snow-ops-images',
  org: 'Northeast River Forecast Center',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/nerfc/snow',
  ttlSeconds: 3600,
  expectedEveryHours: 12,
  season: 'winter',
};

const STATIC_IMAGES: SnowImageAsset[] = [
  {
    id: 'nerfc-nohrsc-sd',
    label: 'NOHRSC modeled snow depth (NERFC composite)',
    url: 'https://www.weather.gov/images/nerfc/ops/nohrsc_full_sd.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: 'Composite from NERFC snow page',
  },
  {
    id: 'nerfc-nohrsc-swe',
    label: 'NOHRSC modeled SWE',
    url: 'https://www.weather.gov/images/nerfc/ops/NOHRSC_model_SWE.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: null,
  },
  {
    id: 'nerfc-nohrsc-melt',
    label: 'NOHRSC 24h melt',
    url: 'https://www.weather.gov/images/nerfc/ops/NOHRSC_melt_24.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: null,
  },
  {
    id: 'nerfc-wpc-regional',
    label: 'WPC regional snowfall (NERFC strip)',
    url: 'https://www.weather.gov/images/nerfc/ops/WPC_Regional_Snow.png',
    org: 'NERFC / WPC',
    validTimeLabel: null,
  },
];

export function readNerfcSnowOpsImages(): Promise<SourceResult<SnowImageAsset[]>> {
  return Promise.resolve({
    status: 'ok',
    data: STATIC_IMAGES,
    issuedAt: null,
    validFrom: null,
    validTo: null,
    sourceUrl: NERFC_SNOW_OPS_DEF.url,
  });
}