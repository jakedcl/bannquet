import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import type { AvgOffice } from '@/lib/mountain-weather/avg-types';
import type { RecOffice } from '@/lib/mountain-weather/rec-types';
import type { AllLocationsOffice } from '@/lib/mountain-weather/all-locations-types';

export type AvgPlaceBinding = {
  office: AvgOffice;
  pointMatch: string;
  nearbyLabel?: string;
  elevationNote?: string;
};

export type RecPlaceBinding = {
  office: RecOffice;
  sectionMatch: string;
  nearbyLabel?: string;
};

export type AllLocationsPlaceBinding = {
  office: AllLocationsOffice;
  loc: string;
  bandLabel?: string;
};

export type BalloonPlaceBinding = {
  regionMatch: string;
  nearbyLabel?: string;
};

export type PlaceSourceBinding = {
  rec?: RecPlaceBinding | RecPlaceBinding[];
  allLocations?: AllLocationsPlaceBinding | AllLocationsPlaceBinding[];
  avg?: AvgPlaceBinding | AvgPlaceBinding[];
  balloon?: BalloonPlaceBinding;
};

type BindingsFile = {
  version: number;
  places: Record<string, PlaceSourceBinding>;
};

const FILE = bindingsJson as BindingsFile;

export function sourceBindingForPlace(placeId: string): PlaceSourceBinding | null {
  return FILE.places[placeId] ?? null;
}
