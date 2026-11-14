export type AvalancheCenterId = 'MWAC' | 'NYSAC';

export type AvalancheMapLayerFeature = {
  productId: number;
  zoneName: string;
  centerId: AvalancheCenterId;
  centerName: string;
  offSeason: boolean;
  travelAdvice: string | null;
  dangerLabel: string | null;
  dangerLevel: number | null;
  link: string | null;
  startDate: string | null;
  endDate: string | null;
  state: string | null;
};

export type AvalancheDangerBand = {
  name: string | null;
  lowerFt: number | null;
  upperFt: number | null;
  danger: string | null;
  dangerLevel: number | null;
  color: string | null;
  validDay: string | null;
};

export type AvalancheProblem = {
  problemType: string | null;
  name: string | null;
  likelihood: string | null;
  size: string | null;
  comment: string | null;
  aspects: string[];
  elevations: string[];
  roseData: unknown;
};

export type AvalancheProductBundle = {
  centerId: AvalancheCenterId;
  productId: number;
  zoneName: string | null;
  offSeason: boolean;
  publishedTime: string | null;
  expiresTime: string | null;
  lastKnownIssued: string | null;
  bottomLine: string | null;
  discussion: string | null;
  travelAdvice: string | null;
  dangerLabel: string | null;
  dangerLevel: number | null;
  dangerBands: AvalancheDangerBand[];
  problems: AvalancheProblem[];
  weatherData: Record<string, unknown> | null;
  observations: Record<string, unknown> | null;
  extraTopLevel: { key: string; value: unknown }[];
  forecastZone: unknown;
  link: string | null;
  mapLayer: AvalancheMapLayerFeature;
};