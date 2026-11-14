import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { PlaceSkyData, UsnoDaySky } from '@/lib/mountain-weather/sky-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { readUsnoRsttOneDay, USNO_RSTT_ONEDAY_DEF } from '@/lib/mountain-weather/readers/usno-rstt-oneday';
import { usnoEtDatesThrough } from '@/lib/mountain-weather/usno-dates';

const SKY_DAYS = 8;

export const USNO_HORIZON_NOTE =
  'Times are for a sea-level horizon at these coordinates. USNO does not adjust for local terrain or summit elevation; sunrise and sunset can differ on peaks and in valleys.';

export const USNO_API_TWILIGHT_NOTE =
  'The USNO rstt/oneday API documents civil twilight begin/end only (not nautical or astronomical). All sundata and moondata fields returned by the API are listed below.';

async function loadDays(lat: number, lon: number, start = new Date()): Promise<PlaceSkyData> {
  const dates = usnoEtDatesThrough(start, SKY_DAYS);
  const results = await Promise.all(dates.map((date) => readUsnoRsttOneDay(date, lat, lon)));
  const days = results.filter((row) => row.status === 'ok' && row.data).map((row) => row.data as NonNullable<(typeof results)[0]['data']>);
  const errors = results.filter((row) => row.status === 'error').map((row) => row.error).filter(Boolean);
  const bundle: SourceResult<UsnoDaySky[]> =
    days.length > 0
      ? {
          status: 'ok',
          data: days,
          issuedAt: new Date().toISOString(),
          validFrom: null,
          validTo: null,
          sourceUrl: results[0]?.sourceUrl ?? USNO_RSTT_ONEDAY_DEF.url,
        }
      : {
          status: 'error',
          data: null,
          issuedAt: null,
          validFrom: null,
          validTo: null,
          sourceUrl: USNO_RSTT_ONEDAY_DEF.url,
          error: errors[0] ?? 'USNO did not return sky data',
        };

  return {
    coords: { lat, lon },
    days,
    bundle,
    horizonNote: USNO_HORIZON_NOTE,
    apiNote: USNO_API_TWILIGHT_NOTE,
  };
}

export async function readPlaceSky(place: MountainPlace): Promise<PlaceSkyData> {
  return loadDays(place.lat, place.lon);
}