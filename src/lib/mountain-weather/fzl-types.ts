export type FzlOffice = 'ALY' | 'GYX';

export type FzlRadatKind = 'single' | 'multi' | 'surface' | 'missing' | 'other';

export type FzlRadat = {
  kind: FzlRadatKind;
  /** Relative humidity at the annotated crossing (%). */
  rhPercent: number | null;
  /** L = RH applies at lowest crossing; H = at highest. */
  rhLevel: 'low' | 'high' | null;
  /** Freezing levels MSL (feet). */
  levelsFt: number[];
  /** Extra crossings when RADAT ends with /N. */
  additionalCrossings: number;
  /** Decoded RADAT payload (without the "RADAT " prefix). */
  payload: string;
  decodeNote: string | null;
};

export type FzlObservation = {
  office: FzlOffice;
  station: string;
  /** HHMM UTC from the data line (e.g. 1200). */
  cycleHhmm: string | null;
  radat: FzlRadat | null;
};

export type FzlBulletin = {
  office: FzlOffice;
  productId: string | null;
  issuanceTime: string | null;
  wmoHeader: string | null;
  productPil: string | null;
  observation: FzlObservation | null;
  preamble: string;
  rawText: string;
};

export type FzlPlaceSlice = {
  office: FzlOffice;
  bulletin: FzlBulletin;
};