import type { VisiblePeak } from './visibility';

export type SkylinePayload = {
  eyeM: number;
  stepDeg: number;
  angleDeg: number[];
  distanceM: number[];
  layers: { angleDeg: number[]; distanceM: number[] }[];
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
  | { type: 'progress'; loaded: number; total: number; stage: string }
  | { type: 'result'; payload: SkylinePayload }
  | { type: 'error'; message: string };
