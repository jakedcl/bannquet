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

export const SOURCE_REGISTRY: Record<string, SourceDef> = {
  [NWS_GRID_BASELINE_DEF.id]: NWS_GRID_BASELINE_DEF,
};
