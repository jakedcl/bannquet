import type { SourceDef } from '@/lib/mountain-weather/source-types';
import { allBoundStationIds } from '@/lib/mountain-weather/station-bindings';
import { nwsStationSourceDef } from '@/lib/mountain-weather/readers/nws-station';
import { ASRC_WHITEFACE_TIMELAPSE_DEF } from '@/lib/mountain-weather/readers/asrc-whiteface-timelapse';
import { AVALANCHE_MAP_LAYER_MWAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-mwac';
import { AVALANCHE_MAP_LAYER_NYSAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-nysac';
import { WPC_PWPF_SNOW_DEF } from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import { NERFC_SNOW_OPS_DEF } from '@/lib/mountain-weather/readers/nerfc-snow-ops';
import { NOHRSC_NE_INDEX_DEF } from '@/lib/mountain-weather/readers/nohrsc-northeast-images';
import { NOHRSC_STATION_SNOWDEPTH_DEF } from '@/lib/mountain-weather/readers/nohrsc-station-snowdepth';

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

export const NWS_FZL_ALY_DEF: SourceDef = {
  id: 'nws-aly-fzl',
  org: 'National Weather Service Albany',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/FZL/locations/ALY',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
};

export const NWS_FZL_GYX_DEF: SourceDef = {
  id: 'nws-gyx-fzl',
  org: 'National Weather Service Gray',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/FZL/locations/GYX',
  ttlSeconds: 1800,
  expectedEveryHours: 12,
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

export const NWS_BTV_MANSFIELD_HYD_DEF: SourceDef = {
  id: 'nws-btv-mansfield-hyd',
  org: 'National Weather Service Burlington',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/rec/mansfieldHYD.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 24,
  season: 'winter',
};

export const NWS_BTV_MANSFIELD_PROFILE_DEF: SourceDef = {
  id: 'nws-btv-mansfield-profile',
  org: 'National Weather Service Burlington',
  kind: 'derived',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/profile/publicprofile.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 1,
};

export const NWS_BTV_MMN_SNOW_CLIM_DEF: SourceDef = {
  id: 'nws-btv-mmn-snow-climatology',
  org: 'National Weather Service Burlington',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/rec/mmn/avgdepth.xml',
  ttlSeconds: 86_400,
  expectedEveryHours: 24,
};

export const NWS_RR2_BTV_DEF: SourceDef = {
  id: 'nws-btv-rr2',
  org: 'National Weather Service Burlington',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/RR2/locations/BTV',
  ttlSeconds: 1800,
  expectedEveryHours: 1,
};

export const NWS_STATION_MMNV1_DEF: SourceDef = {
  id: 'nws-station-mmnv1',
  org: 'National Weather Service',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/stations/MMNV1/observations/latest',
  ttlSeconds: 600,
  expectedEveryHours: 1,
};

export const NWS_BTV_BALLOON_DEF: SourceDef = {
  id: 'nws-btv-balloon',
  org: 'National Weather Service Burlington',
  kind: 'forecast',
  terms: 'reuse-ok',
  url: 'https://www.weather.gov/source/btv/rec/balloon.xml',
  ttlSeconds: 1800,
  expectedEveryHours: 6,
};

const AFD_BULLETIN_BASE = {
  kind: 'official' as const,
  terms: 'reuse-ok' as const,
  ttlSeconds: 1800,
  expectedEveryHours: 12,
};

export const NWS_AFD_BTV_DEF: SourceDef = {
  id: 'nws-btv-afd',
  org: 'National Weather Service Burlington',
  ...AFD_BULLETIN_BASE,
  url: 'https://api.weather.gov/products/types/AFD/locations/BTV',
};

export const NWS_AFD_ALY_DEF: SourceDef = {
  id: 'nws-aly-afd',
  org: 'National Weather Service Albany',
  ...AFD_BULLETIN_BASE,
  url: 'https://api.weather.gov/products/types/AFD/locations/ALY',
};

export const NWS_AFD_GYX_DEF: SourceDef = {
  id: 'nws-gyx-afd',
  org: 'National Weather Service Gray',
  ...AFD_BULLETIN_BASE,
  url: 'https://api.weather.gov/products/types/AFD/locations/GYX',
};

export const NWS_AFD_CAR_DEF: SourceDef = {
  id: 'nws-car-afd',
  org: 'National Weather Service Caribou',
  ...AFD_BULLETIN_BASE,
  url: 'https://api.weather.gov/products/types/AFD/locations/CAR',
};

export const NWS_HWO_BTV_DEF: SourceDef = {
  id: 'nws-btv-hwo',
  org: 'National Weather Service Burlington',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/products/types/HWO/locations/BTV',
  ttlSeconds: 1800,
  expectedEveryHours: 24,
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

const stationRegistry: Record<string, SourceDef> = {};
for (const stationId of allBoundStationIds()) {
  const def = nwsStationSourceDef(stationId);
  stationRegistry[def.id] = def;
}

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
  [NWS_FZL_ALY_DEF.id]: NWS_FZL_ALY_DEF,
  [NWS_FZL_GYX_DEF.id]: NWS_FZL_GYX_DEF,
  [NWS_ALL_LOCATIONS_GYX_DEF.id]: NWS_ALL_LOCATIONS_GYX_DEF,
  [NWS_ALL_LOCATIONS_CAR_DEF.id]: NWS_ALL_LOCATIONS_CAR_DEF,
  [NWS_BTV_MANSFIELD_HYD_DEF.id]: NWS_BTV_MANSFIELD_HYD_DEF,
  [NWS_BTV_MANSFIELD_PROFILE_DEF.id]: NWS_BTV_MANSFIELD_PROFILE_DEF,
  [NWS_BTV_MMN_SNOW_CLIM_DEF.id]: NWS_BTV_MMN_SNOW_CLIM_DEF,
  [NWS_RR2_BTV_DEF.id]: NWS_RR2_BTV_DEF,
  [NWS_STATION_MMNV1_DEF.id]: NWS_STATION_MMNV1_DEF,
  [NWS_BTV_BALLOON_DEF.id]: NWS_BTV_BALLOON_DEF,
  [NWS_AFD_BTV_DEF.id]: NWS_AFD_BTV_DEF,
  [NWS_AFD_ALY_DEF.id]: NWS_AFD_ALY_DEF,
  [NWS_AFD_GYX_DEF.id]: NWS_AFD_GYX_DEF,
  [NWS_AFD_CAR_DEF.id]: NWS_AFD_CAR_DEF,
  [NWS_HWO_BTV_DEF.id]: NWS_HWO_BTV_DEF,
  [ASRC_WHITEFACE_TIMELAPSE_DEF.id]: ASRC_WHITEFACE_TIMELAPSE_DEF,
  [AVALANCHE_MAP_LAYER_MWAC_DEF.id]: AVALANCHE_MAP_LAYER_MWAC_DEF,
  [AVALANCHE_MAP_LAYER_NYSAC_DEF.id]: AVALANCHE_MAP_LAYER_NYSAC_DEF,
  [WPC_PWPF_SNOW_DEF.id]: WPC_PWPF_SNOW_DEF,
  [NERFC_SNOW_OPS_DEF.id]: NERFC_SNOW_OPS_DEF,
  [NOHRSC_NE_INDEX_DEF.id]: NOHRSC_NE_INDEX_DEF,
  [NOHRSC_STATION_SNOWDEPTH_DEF.id]: NOHRSC_STATION_SNOWDEPTH_DEF,
  ...stationRegistry,
};
