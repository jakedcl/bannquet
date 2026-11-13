export type RecOffice = 'BTV' | 'ALY' | 'GYX' | 'CAR';

export type RecPeriod = {
  name: string;
  text: string;
};

/** Structured band rows in Albany lake and elevation REC sections. */
export type RecStructuredBand = {
  label: string;
  fields: Record<string, string | null>;
};

export type RecSection = {
  zoneHeader: string | null;
  ellipsisTitle: string | null;
  theTitle: string | null;
  periods: RecPeriod[];
  bands: RecStructuredBand[];
  searchText: string;
};

export type RecBulletin = {
  issuanceTime: string | null;
  productId: string | null;
  sections: RecSection[];
};

export type RecPlaceSlice = {
  office: RecOffice;
  sectionMatch: string;
  nearbyLabel: string | null;
  section: RecSection;
  issuanceTime: string | null;
  productId: string | null;
};
