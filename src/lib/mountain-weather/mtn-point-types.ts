export type MtnOffice = 'BTV' | 'ALY';

export type MtnNarrativePeriod = {
  name: string;
  text: string;
};

export type MtnTabularPeriod = {
  label: string;
  tempF: number | null;
  windDir: string | null;
  windMph: number | null;
  gustMph: number | null;
  sky: string | null;
  windChillF: number | null;
  precipPct: number | null;
  lightning: string | null;
  snowIn: number | null;
  iceIn: number | null;
};

export type MtnStandardPoint = {
  location: string;
  lat: number;
  lon: number;
  issuedLine: string | null;
  narratives: MtnNarrativePeriod[];
  tabular: MtnTabularPeriod[];
};

export type MtnEnhancedPeriod = {
  time: Date;
  label: string;
  tempF: number | null;
  windDirDeg: number | null;
  windDir?: string | null;
  windMph: number | null;
  gustMph: number | null;
  sky: string | null;
  windChillF: number | null;
  precipPct: number | null;
  snowIn: number | null;
  iceIn: number | null;
};

export type MtnEnhancedPoint = {
  location: string;
  lat: number;
  lon: number;
  cycleStart: Date | null;
  hourly: MtnEnhancedPeriod[];
  snowBlocks: number[];
  iceBlocks: number[];
};

export type MtnPointBundle = {
  loc: string;
  office: MtnOffice;
  standard: MtnStandardPoint | null;
  enhanced: MtnEnhancedPoint | null;
  hasGust: boolean;
  hasIce: boolean;
};

export type MtnFileIndex = Record<string, MtnStandardPoint | MtnEnhancedPoint>;
