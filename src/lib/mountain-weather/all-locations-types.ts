export type AllLocationsOffice = 'GYX' | 'CAR';

export type AllLocationsMarker = {
  type: string | null;
  location: string;
  lat: number | null;
  lon: number | null;
  narrative: string;
  seasonalOff: boolean;
  seasonalMessage: string | null;
};

export type AllLocationsPlaceSlice = {
  office: AllLocationsOffice;
  loc: string;
  bandLabel: string | null;
  marker: AllLocationsMarker;
};
