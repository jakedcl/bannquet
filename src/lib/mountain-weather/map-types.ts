import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { HubGlance } from '@/lib/mountain-weather/hub-glance';

export type MapImageAsset = {
  id: string;
  label: string;
  url: string;
  org: string;
  validTimeLabel: string | null;
};

export type OutlookLink = {
  id: string;
  label: string;
  href: string;
  org: string;
};

export type NwsAlertSummary = {
  id: string;
  event: string;
  severity: string | null;
  headline: string | null;
  ends: string | null;
  areaDesc: string | null;
  effective: string | null;
  expires: string | null;
  onset: string | null;
};

export type NwsAlertsBundle = {
  alerts: NwsAlertSummary[];
  mapGeoJson: GeoJSON.FeatureCollection;
  legend: Array<{ event: string; color: string }>;
};

export type SpcOutlookImage = MapImageAsset & {
  pageUrl: string;
  httpOk: boolean;
};

export type PlaceMapPin = HubGlance & {
  placeId: string;
  lat: number;
  lon: number;
};

export type PlaceMapsData = {
  radarMosaic: MapImageAsset | null;
  radarSite: MapImageAsset | null;
  radarSiteId: string | null;
  goesColor: MapImageAsset | null;
  goesGlm: MapImageAsset | null;
  alerts: SourceResult<NwsAlertsBundle>;
  outlooks: OutlookLink[];
  spcImages: SpcOutlookImage[];
  pins?: PlaceMapPin[];
};

export type MapsHubData = PlaceMapsData & {
  pins: PlaceMapPin[];
};

export type MapsSectionProps = {
  data: PlaceMapsData;
  place?: MountainPlace | null;
};