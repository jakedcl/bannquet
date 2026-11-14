export type AvgOffice = 'BTV' | 'GYX';

export type AvgCell = string | number | null;

export type AvgTableRow = {
  key: string;
  label: string;
  values: AvgCell[];
};

export type AvgDateGrid = {
  dateHeading: string | null;
  timeLabels: string[];
  rows: AvgTableRow[];
};

export type AvgPoint = {
  title: string;
  elevationFt: number | null;
  searchKey: string;
  grids: AvgDateGrid[];
};

export type AvgBulletin = {
  issuanceTime: string | null;
  productId: string | null;
  points: AvgPoint[];
  seasonalOff: boolean;
  seasonalMessage: string | null;
};

export type AvgPlaceSlice = {
  office: AvgOffice;
  pointMatch: string;
  nearbyLabel: string | null;
  elevationNote: string | null;
  point: AvgPoint;
  issuanceTime: string | null;
  productId: string | null;
  seasonalMessage?: string | null;
};
