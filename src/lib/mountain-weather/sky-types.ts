import type { SourceResult } from '@/lib/mountain-weather/source-types';

export type UsnoTimedEvent = {
  phen: string;
  time: string | null;
};

export type UsnoDaySky = {
  dateEt: string;
  dayOfWeek: string | null;
  year: number;
  month: number;
  day: number;
  tzLabel: string;
  isDst: boolean | null;
  label: string | null;
  curphase: string | null;
  fracillum: string | null;
  closestPhase: { phase: string; when: string } | null;
  sunEvents: UsnoTimedEvent[];
  moonEvents: UsnoTimedEvent[];
  dayLength: string | null;
  sourceUrl: string;
};

export type PlaceSkyData = {
  coords: { lat: number; lon: number };
  days: UsnoDaySky[];
  bundle: SourceResult<UsnoDaySky[]>;
  horizonNote: string;
  apiNote: string;
};