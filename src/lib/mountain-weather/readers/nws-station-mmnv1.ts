import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { readNwsStationLatest } from '@/lib/mountain-weather/readers/nws-station';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export async function readMmnv1Latest(): Promise<SourceResult<NwsStationLatest>> {
  return readNwsStationLatest('MMNV1');
}
