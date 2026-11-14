import pointsJson from '../../../config/mountain-weather/mtn-points.json';
import type { MtnOffice } from '@/lib/mountain-weather/mtn-point-types';

export type MtnPointRef = {
  office: MtnOffice;
  loc: string;
};

type PointsFile = {
  version: number;
  points: Array<MtnPointRef & { placeId: string }>;
};

const FILE = pointsJson as PointsFile;

const BY_PLACE = new Map<string, MtnPointRef>(
  FILE.points.map((entry) => [entry.placeId, { office: entry.office, loc: entry.loc }]),
);

export function mtnPointRefForPlace(placeId: string): MtnPointRef | null {
  return BY_PLACE.get(placeId) ?? null;
}

export function allMtnPointRefs(): Array<MtnPointRef & { placeId: string }> {
  return FILE.points;
}
