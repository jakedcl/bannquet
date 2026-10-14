export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const USGS_TOPO_TILES =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}';

export const USGS_IMAGERY_TILES =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';

export const TERRARIUM_TILES =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export const MAP_CENTER = { lng: -73.95, lat: 44.15 };

export const BASEMAPS = ['standard', 'topo', 'satellite', 'hybrid'] as const;
export type BasemapId = (typeof BASEMAPS)[number];

export const BASEMAP_LABELS: Record<BasemapId, string> = {
  standard: 'Standard',
  topo: 'Topo',
  satellite: 'Satellite',
  hybrid: 'Hybrid',
};

export const BASEMAP_ATTRIBUTION: Record<BasemapId, string> = {
  standard: 'Map: OpenFreeMap and OpenStreetMap contributors',
  topo: 'Map: USGS National Map, public domain',
  satellite: 'Imagery: USGS National Map, public domain',
  hybrid: 'Imagery: USGS National Map. Labels: OpenFreeMap and OpenStreetMap contributors',
};

export const TERRAIN_ATTRIBUTION = 'Terrain: AWS Terrain Tiles (Terrarium)';

/** Pins that are not an activity. Kept off the old green. */
export const NEUTRAL_PIN_COLOR = '#444444';

export function isBasemap(value: string): value is BasemapId {
  return (BASEMAPS as readonly string[]).includes(value);
}
