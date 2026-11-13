import type { SourceDef } from '@/lib/mountain-weather/source-types';

export const NWS_GRID_BASELINE_DEF: SourceDef = {
  id: 'nws-grid-baseline',
  org: 'National Weather Service',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/points/{lat},{lon}',
  ttlSeconds: 7200,
  expectedEveryHours: 1,
};

export const NWS_MTN_BTV_STANDARD_DEF: SourceDef = {
  id: 'nws-btv-mtn-standard',
  org: 'National Weather Service Burlington',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/rec/mtnFcst.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_MTN_BTV_ENHANCED_DEF: SourceDef = {
  id: 'nws-btv-mtn-enhanced',
  org: 'National Weather Service Burlington',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/rec/mtnFcstEnhanced.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_MTN_ALY_STANDARD_DEF: SourceDef = {
  id: 'nws-aly-mtn-standard',
  org: 'National Weather Service Albany',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/aly/rec/mtnFcst.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_REC_BTV_DEF: SourceDef = {
  id: 'nws-btv-rec',
  org: 'National Weather Service Burlington',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/REC/locations/BTV',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_REC_ALY_DEF: SourceDef = {
  id: 'nws-aly-rec',
  org: 'National Weather Service Albany',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/REC/locations/ALY',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_REC_GYX_DEF: SourceDef = {
  id: 'nws-gyx-rec',
  org: 'National Weather Service Gray',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/REC/locations/GYX',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_REC_CAR_DEF: SourceDef = {
  id: 'nws-car-rec',
  org: 'National Weather Service Caribou',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/REC/locations/CAR',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const NWS_AVG_BTV_DEF: SourceDef = {
  id: 'nws-btv-avg',
  org: 'National Weather Service Burlington',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/AVG/locations/BTV',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
  season: 'winter',
};

export const NWS_AVG_GYX_DEF: SourceDef = {
  id: 'nws-gyx-avg',
  org: 'National Weather Service Gray',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/AVG/locations/GYX',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
  season: 'winter',
};

export const NWS_ALL_LOCATIONS_GYX_DEF: SourceDef = {
  id: 'nws-gyx-all-locations',
  org: 'National Weather Service Gray',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/gyx/rec/allLocations.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 3,
  season: 'summer',
};

export const NWS_ALL_LOCATIONS_CAR_DEF: SourceDef = {
  id: 'nws-car-all-locations',
  org: 'National Weather Service Caribou',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/car/rec/allLocations.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 3,
};

export const NWS_MTN_ALY_ENHANCED_DEF: SourceDef = {
  id: 'nws-aly-mtn-enhanced',
  org: 'National Weather Service Albany',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/aly/rec/mtnFcstEnhanced.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

export const SOURCE_REGISTRY: Record<string, SourceDef> = {
  [NWS_GRID_BASELINE_DEF.id]: NWS_GRID_BASELINE_DEF,
  [NWS_MTN_BTV_STANDARD_DEF.id]: NWS_MTN_BTV_STANDARD_DEF,
  [NWS_MTN_BTV_ENHANCED_DEF.id]: NWS_MTN_BTV_ENHANCED_DEF,
  [NWS_MTN_ALY_STANDARD_DEF.id]: NWS_MTN_ALY_STANDARD_DEF,
  [NWS_MTN_ALY_ENHANCED_DEF.id]: NWS_MTN_ALY_ENHANCED_DEF,
  [NWS_REC_BTV_DEF.id]: NWS_REC_BTV_DEF,
  [NWS_REC_ALY_DEF.id]: NWS_REC_ALY_DEF,
  [NWS_REC_GYX_DEF.id]: NWS_REC_GYX_DEF,
  [NWS_REC_CAR_DEF.id]: NWS_REC_CAR_DEF,
  [NWS_AVG_BTV_DEF.id]: NWS_AVG_BTV_DEF,
  [NWS_AVG_GYX_DEF.id]: NWS_AVG_GYX_DEF,
  [NWS_ALL_LOCATIONS_GYX_DEF.id]: NWS_ALL_LOCATIONS_GYX_DEF,
  [NWS_ALL_LOCATIONS_CAR_DEF.id]: NWS_ALL_LOCATIONS_CAR_DEF,
};
