import type {
  MansfieldHyd,
  MansfieldProfile,
  MansfieldRr2Summit,
  MansfieldSnowClimatology,
  NwsStationLatest,
} from '@/lib/mountain-weather/mansfield-types';
import { readMansfieldHyd } from '@/lib/mountain-weather/readers/btv-mansfield-hyd';
import { readMansfieldProfile } from '@/lib/mountain-weather/readers/btv-mansfield-profile';
import { readMansfieldSnowClimatology } from '@/lib/mountain-weather/readers/btv-mmn-climatology';
import { readRr2BtvMansfieldSummit } from '@/lib/mountain-weather/readers/nws-rr2-btv';
import { readMmnv1Latest } from '@/lib/mountain-weather/readers/nws-station-mmnv1';
import {
  NWS_BTV_MANSFIELD_HYD_DEF,
  NWS_BTV_MANSFIELD_PROFILE_DEF,
  NWS_BTV_MMN_SNOW_CLIM_DEF,
  NWS_RR2_BTV_DEF,
  NWS_STATION_MMNV1_DEF,
} from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export type MansfieldPackData = {
  station: SourceResult<NwsStationLatest>;
  rr2Summit: SourceResult<MansfieldRr2Summit>;
  profile: SourceResult<MansfieldProfile>;
  hyd: SourceResult<MansfieldHyd>;
  climatology: SourceResult<MansfieldSnowClimatology>;
};

const PACK_SOURCES: { key: keyof MansfieldPackData; def: SourceDef }[] = [
  { key: 'station', def: NWS_STATION_MMNV1_DEF },
  { key: 'rr2Summit', def: NWS_RR2_BTV_DEF },
  { key: 'profile', def: NWS_BTV_MANSFIELD_PROFILE_DEF },
  { key: 'hyd', def: NWS_BTV_MANSFIELD_HYD_DEF },
  { key: 'climatology', def: NWS_BTV_MMN_SNOW_CLIM_DEF },
];

export function mansfieldPackSourceDefs(): typeof PACK_SOURCES {
  return PACK_SOURCES;
}

export async function readMansfieldPack(placeId: string): Promise<MansfieldPackData | null> {
  if (placeId !== 'mount-mansfield') return null;
  const [station, rr2Summit, profile, hyd, climatology] = await Promise.all([
    readMmnv1Latest(),
    readRr2BtvMansfieldSummit(),
    readMansfieldProfile(),
    readMansfieldHyd(),
    readMansfieldSnowClimatology(),
  ]);
  return { station, rr2Summit, profile, hyd, climatology };
}
