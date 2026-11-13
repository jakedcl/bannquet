export type BalloonCell = string | number | null;

export type BalloonRow = {
  key: string;
  label: string;
  values: BalloonCell[];
  unit: 'kt' | 'deg' | 'percent' | 'code' | 'hour' | null;
};

export type BalloonRegion = {
  productLines: string[];
  regionTitle: string;
  searchKey: string;
  cityLines: string[];
  issuanceLine: string | null;
  estHours: string[];
  utcHours: string[];
  rows: BalloonRow[];
  sunriseSunsetLines: string[];
  tafLines: string[];
  footerLines: string[];
  seasonalOff: boolean;
  seasonalMessage: string | null;
};

export type BalloonForecast = {
  regions: BalloonRegion[];
};

export type BalloonPlaceSlice = {
  regionMatch: string;
  nearbyLabel: string | null;
  region: BalloonRegion;
};
