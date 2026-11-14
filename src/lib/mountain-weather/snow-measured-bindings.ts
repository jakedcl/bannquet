import bindingsJson from '../../../config/mountain-weather/snow-measured-bindings.json';
import type { MeasuredSnowBinding } from '@/lib/mountain-weather/snow-types';

type File = {
  version: number;
  ruleSummary: string;
  catalogBuiltAt: string;
  places: Record<string, { measured: MeasuredSnowBinding[] }>;
};

const FILE = bindingsJson as File;

export function snowMeasuredRuleSummary(): string {
  return FILE.ruleSummary;
}

export function snowMeasuredBindingsForPlace(placeId: string): MeasuredSnowBinding[] {
  return FILE.places[placeId]?.measured ?? [];
}