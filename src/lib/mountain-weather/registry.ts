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
};
