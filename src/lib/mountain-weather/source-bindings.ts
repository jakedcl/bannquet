import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import type { RecOffice } from '@/lib/mountain-weather/rec-types';
import type { AllLocationsOffice } from '@/lib/mountain-weather/all-locations-types';

export type PlaceSourceBinding = {
  rec?: {
    office: RecOffice;
    sectionMatch: string;
    nearbyLabel?: string;
  };
  allLocations?: {
    office: AllLocationsOffice;
    loc: string;
  };
};

type BindingsFile = {
  version: number;
  places: Record<string, PlaceSourceBinding>;
};

const FILE = bindingsJson as BindingsFile;

export function sourceBindingForPlace(placeId: string): PlaceSourceBinding | null {
  return FILE.places[placeId] ?? null;
}
