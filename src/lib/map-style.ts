import {
  BASEMAP_ATTRIBUTION,
  USGS_IMAGERY_TILES,
  USGS_TOPO_TILES,
  type BasemapId,
} from './map';

type StyleLayer = { id: string; type: string; source?: string };
type StyleSpec = {
  version?: number;
  sources?: Record<string, unknown>;
  layers?: StyleLayer[];
  [key: string]: unknown;
};

function cloneStyle(style: StyleSpec): StyleSpec {
  return JSON.parse(JSON.stringify(style)) as StyleSpec;
}

function rasterSource(tiles: string, attribution: string) {
  return {
    type: 'raster',
    tiles: [tiles],
    tileSize: 256,
    maxzoom: 16,
    attribution,
  };
}

/**
 * Standard keeps the OpenFreeMap style. Topo and satellite are USGS rasters.
 * Hybrid keeps OpenFreeMap labels on top of the imagery so peaks stay readable.
 */
export function styleForBasemap(openFreeMapStyle: StyleSpec, basemap: BasemapId): StyleSpec {
  if (basemap === 'standard') return cloneStyle(openFreeMapStyle);

  const style = cloneStyle(openFreeMapStyle);
  const tiles = basemap === 'topo' ? USGS_TOPO_TILES : USGS_IMAGERY_TILES;
  style.sources = {
    ...(style.sources ?? {}),
    'bannquet-raster': rasterSource(tiles, BASEMAP_ATTRIBUTION[basemap]),
  };
  const raster = { id: 'bannquet-raster', type: 'raster', source: 'bannquet-raster' };
  const symbols = (style.layers ?? []).filter((layer) => layer.type === 'symbol');
  style.layers = basemap === 'hybrid' ? [raster, ...symbols] : [raster];
  return style;
}
