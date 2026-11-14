import bindingsJson from '../../../config/mountain-weather/station-bindings.json';

export type StationObsKind = 'summit' | 'valley' | 'base' | 'nearby-higher';

export type PlaceStationObservationBinding = {
  stationId: string;
  kind: StationObsKind;
  network: string;
  stationName: string | null;
  stationElevationFt: number | null;
  elevationSource?: string;
  nwsElevationFt?: number | null;
  epqsElevationFt?: number | null;
  distanceMi: number;
  elevationDiffFt: number | null;
  bindReason: string;
  hideFromObservationsSection?: boolean;
};

export type StationMeta = {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  elevationFt: number | null;
  state: string | null;
  office: string | null;
};

export type PlaceStationBinding = {
  asrcTimelapse: boolean;
  observations: PlaceStationObservationBinding[];
};

type StationBindingsFile = {
  version: number;
  ruleSummary: string;
  stations: Record<string, StationMeta>;
  places: Record<string, PlaceStationBinding>;
};

const FILE = bindingsJson as StationBindingsFile;

export function stationBindingRuleSummary(): string {
  return FILE.ruleSummary;
}

export function stationBindingForPlace(placeId: string): PlaceStationBinding | null {
  return FILE.places[placeId] ?? null;
}

export function stationMeta(stationId: string): StationMeta | null {
  return FILE.stations[stationId] ?? null;
}

export function visibleStationBindings(placeId: string): PlaceStationObservationBinding[] {
  const binding = stationBindingForPlace(placeId);
  if (!binding) return [];
  return binding.observations.filter((o) => !o.hideFromObservationsSection);
}

export function allBoundStationIds(): string[] {
  const ids = new Set<string>();
  for (const place of Object.values(FILE.places)) {
    for (const obs of place.observations) ids.add(obs.stationId);
  }
  return [...ids].sort();
}