export type MansfieldHydRow = {
  station: string;
  precip24h: string | null;
  tempMax: string | null;
  tempMin: string | null;
  tempCur: string | null;
  presentWeather: string | null;
  snowNew: string | null;
  snowTotal: string | null;
  swe: string | null;
};

export type MansfieldHyd = {
  headerLines: string[];
  row: MansfieldHydRow;
  seasonalOff: boolean;
  seasonalMessage: string | null;
};

export type ProfileStationRow = {
  id: string;
  elevationFt: number | null;
  temperature: string | null;
  windDir: string | null;
  wind: string | null;
  gust: string | null;
};

export type MansfieldProfile = {
  stations: ProfileStationRow[];
  lapse: string | null;
  shear: string | null;
  froude: string | null;
  lclFt: string | null;
};

export type MmnDepthPoint = {
  monthIndex: number;
  day: number;
  depthIn: number | null;
};

export type MansfieldSnowClimatology = {
  avg: MmnDepthPoint[];
  max: MmnDepthPoint[];
  min: MmnDepthPoint[];
};

export type Rr2ShefField = {
  code: string;
  value: string | null;
};

export type MansfieldRr2Summit = {
  stationId: string;
  rawLine: string;
  reportHeader: string | null;
  shefFields: Rr2ShefField[];
  summitTempF: number | null;
};

export type NwsStationField = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  qualityControl: string | null;
  qcFailed: boolean;
};

export type NwsStationLatest = {
  stationId: string;
  stationName: string | null;
  timestamp: string | null;
  fields: NwsStationField[];
};
