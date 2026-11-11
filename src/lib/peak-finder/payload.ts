import type { VisiblePeak } from './visibility';

export type SkylinePayload = {
  eyeM: number;
  stepDeg: number;
  angleDeg: number[];
  distanceM: number[];
  layers: {
    angleDeg: number[];
    distanceM: number[];
    hiddenAngleDeg: number[];
    hiddenDistanceM: number[];
  }[];
  peaks: VisiblePeak[];
  onSummit: { name: string; elevationM: number } | null;
};

export type WorkerIn = {
  type: 'build';
  lat: number;
  lng: number;
  peaks: { name: string; lat: number; lng: number; elevationM: number | null }[];
};

export type WorkerOut =
  /** 0–1. Terrain tiles fill ~0–0.85; skyline work holds at 0.85 until the result. */
  | { type: 'progress'; fraction: number }
  | { type: 'result'; payload: SkylinePayload }
  | { type: 'error'; message: string };
