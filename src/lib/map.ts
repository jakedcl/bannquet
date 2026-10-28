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

const CLUSTER_KIND_ORDER = ['route', 'pin', 'photo'] as const;

const CLUSTER_KIND_LABEL: Record<(typeof CLUSTER_KIND_ORDER)[number], readonly [string, string]> = {
  route: ['route', 'routes'],
  pin: ['pin', 'pins'],
  photo: ['photo', 'photos'],
};

function isClusterKind(kind: string): kind is (typeof CLUSTER_KIND_ORDER)[number] {
  return (CLUSTER_KIND_ORDER as readonly string[]).includes(kind);
}

/** Cluster popup title. Known marker types are counted separately. */
export function clusterHeading(kinds: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const kind of kinds) {
    const key = isClusterKind(kind) ? kind : 'item';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const parts: string[] = [];
  for (const kind of CLUSTER_KIND_ORDER) {
    const count = counts.get(kind) ?? 0;
    if (count === 0) continue;
    const [one, many] = CLUSTER_KIND_LABEL[kind];
    parts.push(`${count} ${count === 1 ? one : many}`);
  }
  const items = counts.get('item') ?? 0;
  if (items > 0) parts.push(items === 1 ? '1 item' : `${items} items`);
  if (parts.length === 0) return '0 items here';
  if (parts.length === 1 && items === kinds.length) {
    return items === 1 ? '1 item here' : `${items} items here`;
  }
  return parts.join(', ');
}
