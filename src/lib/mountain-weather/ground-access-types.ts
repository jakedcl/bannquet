import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { MoreSourceLink } from '@/lib/mountain-weather/more-sources';

export type GroundLink = MoreSourceLink & { id: string };

export type CountyDroughtRow = {
  fips: string;
  county: string;
  state: string;
  validStart: string;
  validEnd: string;
  mapDate: string;
  dominant: 'None' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  nonePct: number;
  d0Pct: number;
  d1Pct: number;
  d2Pct: number;
  d3Pct: number;
  d4Pct: number;
};

export type CompassEssRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMi: number;
  distant: boolean;
  roadSurfaceCond: string | null;
  airTempF: number | null;
  pavementTempF: number | null;
  windSpeed: number | null;
  windDir: string | null;
  observedAt: string | null;
  observedAtEt: string | null;
  timestampNote: string;
  sourceUrl: string;
};

export type CompassCameraRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMi: number;
  distant: boolean;
  imageUrl: string | null;
  status: string | null;
  sourceUrl: string;
};

export type PlaceGroundData = {
  landLinks: GroundLink[];
  drought: SourceResult<CountyDroughtRow | null>;
  compassEss: SourceResult<CompassEssRow | null>;
  compassCamera: SourceResult<CompassCameraRow | null>;
  airNow: SourceResult<{ aqi: number; category: string; parameter: string; observedAt: string } | null>;
  airQualityNote: string;
  airNowLink: string;
};