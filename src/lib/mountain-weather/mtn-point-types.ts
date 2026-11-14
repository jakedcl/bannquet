export type MtnOffice = 'BTV' | 'ALY';

export type MtnAmount = number | 'T' | null;

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
};

export type MtnStandardPoint = {
  location: string;
  lat: number | null;
  lon: number | null;
  elevationFt: number | null;
  issuedLine: string | null;
  narratives: MtnNarrativePeriod[];
  tabular: MtnTabularPeriod[];
  snowBlocks: MtnAmount[];
  iceBlocks: MtnAmount[];
  snowBlockLabels: string[];
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
};

export type MtnEnhancedPoint = {
  location: string;
  lat: number | null;
  lon: number | null;
  elevationFt: number | null;
  cycleStart: Date | null;
  hourly: MtnEnhancedPeriod[];
  snowBlocks: MtnAmount[];
  iceBlocks: MtnAmount[];
};

export type MtnPointBundle = {
  loc: string;
  office: MtnOffice;
  standard: MtnStandardPoint | null;
  enhanced: MtnEnhancedPoint | null;
};
