import {
  stationBindingForPlace,
  visibleStationBindings,
  type PlaceStationObservationBinding,
} from '@/lib/mountain-weather/station-bindings';
import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { readAscrWhitefaceTimelapse, type AscrWhitefaceTimelapse } from '@/lib/mountain-weather/readers/asrc-whiteface-timelapse';
import { readNwsStationLatest } from '@/lib/mountain-weather/readers/nws-station';
import { nwsStationSourceDef } from '@/lib/mountain-weather/readers/nws-station';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export type StationObservationBlock = {
  binding: PlaceStationObservationBinding;
  def: SourceDef;
  result: SourceResult<NwsStationLatest>;
};

export type PlaceObservationsData = {
  stations: StationObservationBlock[];
  asrc: SourceResult<AscrWhitefaceTimelapse> | null;
};

export async function readPlaceObservations(placeId: string): Promise<PlaceObservationsData | null> {
  const binding = stationBindingForPlace(placeId);
  if (!binding) return null;

  const visible = visibleStationBindings(placeId);
  const stationReads = await Promise.all(
    visible.map(async (b) => ({
      binding: b,
      def: nwsStationSourceDef(b.stationId),
      result: await readNwsStationLatest(b.stationId),
    })),
  );

  const asrc = binding.asrcTimelapse ? await readAscrWhitefaceTimelapse() : null;

  if (stationReads.length === 0 && !binding.asrcTimelapse) return null;

  return { stations: stationReads, asrc };
}