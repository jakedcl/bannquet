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
    label: 'Modeled snow depth',
    url: 'https://www.weather.gov/images/nerfc/ops/nohrsc_full_sd.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: 'Composite from NERFC snow page',
  },
  {
    id: 'nerfc-nohrsc-swe',
    label: 'Modeled water in the snowpack (SWE)',
    url: 'https://www.weather.gov/images/nerfc/ops/NOHRSC_model_SWE.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: null,
  },
  {
    id: 'nerfc-nohrsc-melt',
    label: 'Snowmelt, 24 hours',
    url: 'https://www.weather.gov/images/nerfc/ops/NOHRSC_melt_24.png',
    org: 'NERFC / NOHRSC',
    validTimeLabel: null,
  },
  {
    id: 'nerfc-wpc-regional',
    label: 'Forecast snowfall (WPC)',
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