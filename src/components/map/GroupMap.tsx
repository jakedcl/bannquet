'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LngLatBounds,
  Map as MlMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatLike,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Turbopack rewrites import.meta.url, so MapLibre looks for its worker next to
// the page chunk and gets HTML back. Serve the real worker as a static file.
setWorkerUrl('/maplibre-gl-worker.mjs');
import {
  BASEMAPS,
  BASEMAP_ATTRIBUTION,
  BASEMAP_LABELS,
  MAP_CENTER,
  OPENFREEMAP_STYLE_URL,
  TERRAIN_ATTRIBUTION,
  clusterHeading,
  type BasemapId,
} from '@/lib/map';
import { styleForBasemap } from '@/lib/map-style';
import { LayersIcon } from '@/components/hub/Icons';
import { leafFromProps, leafMeta, type MapLeaf } from '@/lib/map-leaf';
import type { MapFeatureCollection } from '@/lib/posts';

type Leaf = MapLeaf;

type Props = {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  focus?: { lng: number; lat: number; zoom?: number } | null;
  picking?: boolean;
  onPick?: (lng: number, lat: number) => void;
  className?: string;
  preview?: boolean;
  /** Show what was tapped in your own panel instead of a popup. Null means the empty map was tapped. */
  onSelect?: (leaves: MapLeaf[] | null) => void;
  /** Where the map credit sits, as position classes. */
  creditClassName?: string;
};

function fitPins(map: MlMap, points: MapFeatureCollection) {
  const coords: [number, number][] = [];
  for (const feature of points.features) {
    if (feature.geometry.type !== 'Point') continue;
    const [lng, lat] = feature.geometry.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') coords.push([lng, lat]);
  }
  if (coords.length === 0) return;
  if (coords.length === 1) {
    map.jumpTo({ center: coords[0], zoom: 10 });
    return;
  }
  const bounds = coords.reduce((box, coord) => box.extend(coord), new LngLatBounds(coords[0], coords[0]));
  map.fitBounds(bounds, { padding: 24, maxZoom: 11, animate: false });
}

function popupNode(leaves: Leaf[]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-2 text-[15px] leading-snug';
  const heading = document.createElement('p');
  heading.className = 'pr-6 text-xs font-bold uppercase';
  heading.textContent = clusterHeading(leaves.map((leaf) => leaf.kind));
  root.append(heading);
  for (const leaf of leaves) {
    const link = document.createElement('a');
    link.href = leaf.href;
    link.className = 'block bg-white p-2 retro-box-inset';
    const title = document.createElement('span');
    title.className = 'block text-sm font-bold';
    const swatch = document.createElement('span');
    swatch.className = 'mr-2 inline-block h-2 w-2';
    swatch.style.background = leaf.color;
    title.append(swatch, document.createTextNode(leaf.title));
    const meta = document.createElement('span');
    meta.className = 'mt-1 block text-xs text-gray-700';
    meta.textContent = leafMeta(leaf);
    link.append(title, meta);
    root.append(link);
  }
  return root;
}

function showPopup(map: MlMap, popupRef: { current: Popup | null }, lngLat: LngLatLike, leaves: Leaf[]) {
  popupRef.current?.remove();
  if (leaves.length === 0) return;
  const popup = new Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '22rem',
    className: 'bnqt-popup',
    offset: 12,
  })
    .setLngLat(lngLat)
    .setDOMContent(popupNode(leaves))
    .addTo(map);
  popupRef.current = popup;
  popup.on('close', () => {
    if (popupRef.current === popup) popupRef.current = null;
  });
}

function leafFromFeature(feature: { geometry: unknown; properties?: GeoJSON.GeoJsonProperties }): Leaf | null {
  const geometry = feature.geometry as { type?: string; coordinates?: unknown };
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as number[];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return leafFromProps(props, lng, lat);
}

export default function GroupMap({
  points,
  lines,
  focus = null,
  picking = false,
  onPick,
  className = '',
  preview = false,
  onSelect,
  creditClassName = 'bottom-2 right-2',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const pointsRef = useRef(points);
  const linesRef = useRef(lines);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelect);
  const [basemap, setBasemap] = useState<BasemapId>('standard');
  const [layersOpen, setLayersOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [terrain, setTerrain] = useState(false);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    pointsRef.current = points;
    linesRef.current = lines;
    pickingRef.current = picking;
    onPickRef.current = onPick;
    onSelectRef.current = onSelect;
  }, [lines, onPick, onSelect, picking, points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [focus?.lng ?? MAP_CENTER.lng, focus?.lat ?? MAP_CENTER.lat],
      zoom: focus?.zoom ?? (preview ? 6 : 8),
      pitch: 0,
      maxPitch: preview ? 0 : 75,
      attributionControl: false,
      interactive: !preview,
      dragPan: !preview,
      scrollZoom: !preview,
      boxZoom: !preview,
      dragRotate: !preview,
      keyboard: !preview,
      doubleClickZoom: !preview,
      touchZoomRotate: !preview,
      touchPitch: !preview,
    });
    if (!preview) map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;
    requestAnimationFrame(() => map.resize());

    map.on('click', (event) => {
      if (preview) return;
      const pick = onPickRef.current;
      const layers = ['clusters', 'pins', 'pin-markers', 'routes'].filter((id) => Boolean(map.getLayer(id)));
      const hits = layers.length > 0 ? map.queryRenderedFeatures(event.point, { layers }) : [];
      if (!pickingRef.current && hits.length === 0) onSelectRef.current?.(null);
      if (!pickingRef.current || !pick) return;
      const blocked = hits.some((feature) => Number(feature.properties?.draft) !== 1);
      if (blocked) return;
      pick(event.lngLat.lng, event.lngLat.lat);
    });

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [focus?.lat, focus?.lng, focus?.zoom, preview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    async function applyStyle() {
      if (!map) return;
      if (basemap === 'standard') {
        map.setStyle(OPENFREEMAP_STYLE_URL);
        return;
      }
      const response = await fetch(OPENFREEMAP_STYLE_URL);
      const raw = (await response.json()) as StyleSpecification;
      if (cancelled) return;
      map.setStyle(styleForBasemap(raw, basemap) as StyleSpecification);
    }

    void applyStyle();
    return () => {
      cancelled = true;
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const origin = window.location.origin;
      if (map.getLayer('route-hidden-ends')) map.removeLayer('route-hidden-ends');
      if (map.getLayer('routes')) map.removeLayer('routes');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('pin-markers')) map.removeLayer('pin-markers');
      if (map.getLayer('pins')) map.removeLayer('pins');
      if (map.getSource('routes')) map.removeSource('routes');
      if (map.getSource('places')) map.removeSource('places');
      if (map.getSource('terrain')) map.removeSource('terrain');

      if (terrain) {
        map.addSource('terrain', {
          type: 'raster-dem',
          tiles: [`${origin}/api/terrain/{z}/{x}/{y}`],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15,
          attribution: TERRAIN_ATTRIBUTION,
        });
        map.setTerrain({ source: 'terrain', exaggeration: 1.4 });
        map.easeTo({ pitch: 62, duration: 600 });
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      } else if (!preview) {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
      } else {
        map.setTerrain(null);
      }

      map.addSource('routes', { type: 'geojson', data: linesRef.current });
      // Lines are not filtered by pin visibility. Clustering and the viewport
      // query only describe point markers, and a line has to draw when any
      // part of it is on screen. There are few tracks, so they all stay loaded.
      map.addLayer({
        id: 'routes',
        type: 'line',
        source: 'routes',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 },
      });
      // A route with hidden ends gets a soft fog over each cut, sized in
      // meters, so the line fades out instead of stopping at a real spot.
      map.addLayer({
        id: 'route-hidden-ends',
        type: 'circle',
        source: 'routes',
        filter: ['==', ['get', 'kind'], 'hidden-end'],
        paint: {
          'circle-color': '#f4f1ea',
          'circle-opacity': 0.95,
          'circle-blur': 0.9,
          'circle-radius': [
            'interpolate', ['exponential', 2], ['zoom'],
            0, ['get', 'zoneRadius'],
            24, ['*', ['get', 'zoneRadius'], 16777216],
          ],
        },
      });
      map.addSource('places', {
        type: 'geojson',
        data: pointsRef.current,
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 14,
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2d5016',
          'circle-radius': ['step', ['get', 'point_count'], 16, 8, 20, 20, 26],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'pins',
        type: 'circle',
        source: 'places',
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'kind'], 'pin']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: 'pin-markers',
        type: 'symbol',
        source: 'places',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'pin']],
        layout: {
          'text-field': '▼',
          'text-font': ['Noto Sans Bold'],
          'text-size': 22,
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
      if (preview) fitPins(map, pointsRef.current);
    };

    const reveal = (at: LngLatLike, leaves: Leaf[]) => {
      const select = onSelectRef.current;
      if (!select) {
        showPopup(map, popupRef, at, leaves);
        return;
      }
      if (leaves.length === 0) return;
      select(leaves);
      map.easeTo({ center: at, duration: 400 });
    };

    const onCluster = async (event: MapLayerMouseEvent) => {
      if (preview || pickingRef.current) return;
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource('places') as GeoJSONSource | undefined;
      if (!source || clusterId == null || !feature) return;
      const children = await source.getClusterLeaves(Number(clusterId), 40, 0);
      const leaves = children.map(leafFromFeature).filter((leaf): leaf is Leaf => Boolean(leaf));
      const geometry = feature.geometry as { type?: string; coordinates?: unknown };
      const coords = geometry.type === 'Point' && Array.isArray(geometry.coordinates)
        ? geometry.coordinates as [number, number]
        : [event.lngLat.lng, event.lngLat.lat] as [number, number];
      reveal(coords, leaves);
    };
    const onPin = (event: MapLayerMouseEvent) => {
      if (preview || pickingRef.current) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const leaf = leafFromFeature(feature);
      if (!leaf) return;
      reveal([leaf.lng, leaf.lat], [leaf]);
    };
    const onRoute = (event: MapLayerMouseEvent) => {
      if (preview || pickingRef.current) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const leaf = leafFromProps(props, event.lngLat.lng, event.lngLat.lat);
      reveal(event.lngLat, [leaf]);
    };

    map.on('style.load', draw);
    if (map.isStyleLoaded()) draw();
    if (preview) {
      return () => {
        popupRef.current?.remove();
        map.off('style.load', draw);
      };
    }
    map.on('click', 'clusters', onCluster);
    map.on('click', 'pins', onPin);
    map.on('click', 'pin-markers', onPin);
    map.on('click', 'routes', onRoute);
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });
    map.on('mouseenter', 'pins', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pins', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });
    map.on('mouseenter', 'pin-markers', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pin-markers', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });
    map.on('mouseenter', 'routes', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'routes', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });

    return () => {
      popupRef.current?.remove();
      map.off('style.load', draw);
      map.off('click', 'clusters', onCluster);
      map.off('click', 'pins', onPin);
      map.off('click', 'pin-markers', onPin);
      map.off('click', 'routes', onRoute);
    };
  }, [terrain, basemap, picking, preview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource('places')) return;
    (map.getSource('places') as GeoJSONSource).setData(points);
    (map.getSource('routes') as GeoJSONSource).setData(lines);
    if (preview) fitPins(map, points);
  }, [points, lines, preview]);

  // Escape closes an open popup, like the layers menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !popupRef.current) return;
      popupRef.current.remove();
      popupRef.current = null;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!layersOpen) return;
    const close = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) setLayersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLayersOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [layersOpen]);

  const attribution = terrain
    ? `${BASEMAP_ATTRIBUTION[basemap]}. ${TERRAIN_ATTRIBUTION}`
    : BASEMAP_ATTRIBUTION[basemap];

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={containerRef} className={`h-full w-full ${picking ? 'cursor-crosshair' : ''}`} />
      {preview ? (
        <p className="pointer-events-none absolute bottom-1 left-1 z-10 max-w-[70%] truncate text-[10px] text-gray-700">
          {BASEMAP_ATTRIBUTION.standard}
        </p>
      ) : null}
      {preview ? null : (
      <div ref={controlsRef} className="map-controls hub-bar absolute right-2.5 top-[7.25rem] z-10 flex flex-col items-end gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="Map layers"
            aria-expanded={layersOpen}
            aria-haspopup="menu"
            onClick={() => setLayersOpen((open) => !open)}
            className={`ui-glass ui-press flex h-[29px] w-[29px] items-center justify-center rounded-lg shadow-[var(--ui-shadow)] ${layersOpen ? 'text-ui-accent' : 'text-ui-label'}`}
          >
            <LayersIcon className="h-[18px] w-[18px]" />
          </button>
          {layersOpen ? (
            <div role="menu" aria-label="Map layers" className="ui-glass ui-sheet-in absolute right-full top-0 z-20 mr-2 flex min-w-40 flex-col rounded-2xl p-1.5 shadow-[var(--ui-shadow-lg)]">
              {BASEMAPS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={basemap === id}
                  onClick={() => {
                    setBasemap(id);
                    setLayersOpen(false);
                  }}
                  className="ui-row-press flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[0.9375rem] text-ui-label"
                >
                  {BASEMAP_LABELS[id]}
                  {basemap === id ? <span aria-hidden="true" className="text-ui-accent">✓</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-pressed={terrain}
          onClick={() => {
            setLayersOpen(false);
            setTerrain((value) => !value);
          }}
          className={`ui-press flex h-[29px] w-[29px] items-center justify-center rounded-lg text-[0.75rem] font-bold shadow-[var(--ui-shadow)] ${terrain ? 'bg-ui-accent text-ui-on-accent' : 'ui-glass text-ui-label'}`}
        >
          3D
        </button>
      </div>
      )}
      {preview ? null : (
        <p className={`hub-bar pointer-events-none absolute z-10 max-w-[min(70%,28rem)] truncate rounded-md bg-[var(--ui-glass)] px-1.5 py-0.5 text-[10px] text-ui-label-2 ${creditClassName}`}>
          {attribution}
        </p>
      )}
      {picking ? (
        <p className="hub-bar ui-glass pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-ui-label shadow-[var(--ui-shadow)]">
          Tap the map to drop a pin
        </p>
      ) : null}
    </div>
  );
}
