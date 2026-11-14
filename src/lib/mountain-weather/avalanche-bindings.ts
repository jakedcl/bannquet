import bindingsJson from '../../../config/mountain-weather/avalanche-bindings.json';
import avgPointsJson from '../../../config/mountain-weather/avalanche-avg-points.json';
import type { AvalancheCenterId } from '@/lib/mountain-weather/avalanche-types';

export type PlaceAvalancheBinding = {
  centers: AvalancheCenterId[];
  bindReason: string;
};

export type AvgAvalanchePoint = {
  slug: string;
  office: 'BTV' | 'GYX';
  pointMatch: string;
  title: string;
  nearbyLabel: string | null;
  elevationNote: string | null;
  examplePlaceId: string;
};

type BindingsFile = {
  version: number;
  ruleSummary: string;
  places: Record<string, PlaceAvalancheBinding>;
};

type AvgPointsFile = {
  version: number;
  points: AvgAvalanchePoint[];
};

const FILE = bindingsJson as BindingsFile;
const AVG = avgPointsJson as AvgPointsFile;

export function avalancheRuleSummary(): string {
  return FILE.ruleSummary;
}

export function avalancheBindingForPlace(placeId: string): PlaceAvalancheBinding | null {
  return FILE.places[placeId] ?? null;
}

export function avalancheAvgPoints(): AvgAvalanchePoint[] {
  return AVG.points;
}

export function avalancheAvgPointBySlug(slug: string): AvgAvalanchePoint | null {
  return AVG.points.find((p) => p.slug === slug) ?? null;
}