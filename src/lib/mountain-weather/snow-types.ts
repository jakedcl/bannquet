import type { MountainWfo } from '@/lib/mountain-weather/nws-office';

export type SnowPhysicalElement = 'snowdepth' | 'snowfall' | 'precip' | 'unknown';

export type SnowImageAsset = {
  id: string;
  label: string;
  url: string;
  org: string;
  validTimeLabel: string | null;
};

export type StormReportLine = {
  location: string;
  amount: string;
  amountIn: number | null;
  timeLabel: string;
  provider: string | null;
  isSnow: boolean;
};

export type StormReportProduct = {
  office: MountainWfo;
  productId: string | null;
  title: string | null;
  issuanceTime: string | null;
  parsedLines: StormReportLine[];
  fullText: string;
  parseReliable: boolean;
};

export type IemLsrSnowEvent = {
  id: string;
  valid: string;
  city: string | null;
  county: string | null;
  state: string | null;
  lat: number;
  lon: number;
  magnitude: number | null;
  unit: string | null;
  remark: string | null;
};

export type MeasuredSnowBindingKind = 'summit' | 'valley' | 'base' | 'nearby-higher';

export type MeasuredSnowBinding = {
  stationId: string;
  source: 'NOHRSC' | 'IEM_COOP' | 'COCORAHS';
  network: string;
  stationName: string;
  lat: number;
  lon: number;
  stationElevationFt: number | null;
  elevationSource?: string;
  nohrscElevationFt?: number | null;
  epqsElevationFt?: number | null;
  distanceMi: number;
  elevationDiffFt: number | null;
  kind: MeasuredSnowBindingKind;
  element: SnowPhysicalElement;
  bindReason: string;
};

export type MeasuredSnowReport = {
  binding: MeasuredSnowBinding;
  reportTimeUtc: string | null;
  reportTimeEt: string | null;
  value: number | null;
  valueDisplay: string;
  units: string;
  windowLabel: string;
  element: SnowPhysicalElement;
  dedupeKey: string;
};

export type MansfieldStakeSnow = {
  snowNew: string | null;
  snowTotal: string | null;
  asOf: string | null;
};

export type PlaceSnowData = {
  office: MountainWfo;
  wpcImages: SnowImageAsset[];
  nerfcImages: SnowImageAsset[];
  nohrscImages: SnowImageAsset[];
  winterPageUrl: string;
  wssiUrl: string;
  pns: StormReportProduct | null;
  lsrSnow: IemLsrSnowEvent[];
  measured: MeasuredSnowReport[];
  mansfieldStake: MansfieldStakeSnow | null;
};