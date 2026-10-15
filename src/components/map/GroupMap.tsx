'use client';

import { useEffect, useRef, useState } from 'react';
import {
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
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatTripDate } from '@/lib/utils';
import type { MapFeatureCollection } from '@/lib/posts';

type Leaf = {
  title: string;
  who: string;
  date: string | null;
  activity: string | null;
  category: string;
  kind: string;
  color: string;
  trackId: string;
  href: string;
  lng: number;
  lat: number;
};

type Props = {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  focus?: { lng: number; lat: number; zoom?: number } | null;
  picking?: boolean;
  onPick?: (lng: number, lat: number) => void;
  className?: string;
};

function activityLabel(activity: string | null): string {
  if (activity && isActivity(activity)) return ACTIVITY_META[activity].label;
  return 'Photo';
}

function leafFromProps(
  props: Record<string, unknown>,
  lng: number,
  lat: number,
): Leaf {
  return {
    title: String(props.title ?? 'Pin'),
    who: String(props.who ?? 'Friend'),
    date: props.date ? String(props.date) : null,
    activity: props.activity ? String(props.activity) : null,
    category: props.category ? String(props.category) : '',
    kind: props.kind ? String(props.kind) : props.trackId ? 'route' : '',
    color: String(props.color ?? '#444444'),
    trackId: String(props.trackId ?? ''),
    href: String(props.href ?? '/map'),
    lng,
    lat,
  };
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
    const bits = [leaf.who];
    if (leaf.date) bits.push(formatTripDate(leaf.date));
    bits.push(activityLabel(leaf.activity));
    if (leaf.category) bits.push(leaf.category);
    meta.textContent = bits.join(' · ');
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
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const pointsRef = useRef(points);
  const linesRef = useRef(lines);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
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
  }, [lines, onPick, picking, points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [focus?.lng ?? MAP_CENTER.lng, focus?.lat ?? MAP_CENTER.lat],
      zoom: focus?.zoom ?? 8,
      pitch: 0,
      maxPitch: 75,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;
    requestAnimationFrame(() => map.resize());

    map.on('click', (event) => {
      const pick = onPickRef.current;
      if (!pickingRef.current || !pick) return;
      const layers = ['clusters', 'pins', 'pin-markers', 'routes'].filter((id) => Boolean(map.getLayer(id)));
      const hits = layers.length > 0 ? map.queryRenderedFeatures(event.point, { layers }) : [];
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
  }, [focus?.lat, focus?.lng, focus?.zoom]);

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
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
      }

      map.addSource('routes', { type: 'geojson', data: linesRef.current });
      // Lines are not filtered by pin visibility. Clustering and the viewport
      // query only describe point markers, and a line has to draw when any
      // part of it is on screen. There are few tracks, so they all stay loaded.
      map.addLayer({
        id: 'routes',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 },
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
          'circle-color': '#1a1a1a',
          'circle-radius': ['step', ['get', 'point_count'], 16, 8, 20, 20, 26],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f4f1ea',
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
    };

    const onCluster = async (event: MapLayerMouseEvent) => {
      if (pickingRef.current) return;
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
      showPopup(map, popupRef, coords, leaves);
    };
    const onPin = (event: MapLayerMouseEvent) => {
      if (pickingRef.current) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const leaf = leafFromFeature(feature);
      if (!leaf) return;
      showPopup(map, popupRef, [leaf.lng, leaf.lat], [leaf]);
    };
    const onRoute = (event: MapLayerMouseEvent) => {
      if (pickingRef.current) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const leaf = leafFromProps(props, event.lngLat.lng, event.lngLat.lat);
      showPopup(map, popupRef, event.lngLat, [leaf]);
    };

    map.on('style.load', draw);
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
    if (map.isStyleLoaded()) draw();

    return () => {
      popupRef.current?.remove();
      map.off('style.load', draw);
      map.off('click', 'clusters', onCluster);
      map.off('click', 'pins', onPin);
      map.off('click', 'pin-markers', onPin);
      map.off('click', 'routes', onRoute);
    };
  }, [terrain, basemap, picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource('places')) return;
    (map.getSource('places') as GeoJSONSource).setData(points);
    (map.getSource('routes') as GeoJSONSource).setData(lines);
  }, [points, lines]);

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
      <div ref={controlsRef} className="map-controls absolute left-3 top-3 z-10 flex items-start gap-2">
        <div className="relative">
          <button
            type="button"
            aria-expanded={layersOpen}
            aria-haspopup="menu"
            onClick={() => setLayersOpen((open) => !open)}
            className={`retro-button rounded-none px-3 py-1 text-xs font-bold uppercase ${layersOpen ? 'retro-button-yellow' : ''}`}
          >
            Layers
          </button>
          {layersOpen ? (
            <div role="menu" aria-label="Map layers" className="absolute left-0 top-full z-20 mt-1 flex min-w-36 flex-col gap-1 bg-beige p-1 retro-box">
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
                  className={`retro-button rounded-none px-3 py-1 text-left text-xs font-bold uppercase ${basemap === id ? 'retro-button-yellow' : ''}`}
                >
                  {BASEMAP_LABELS[id]}
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
          className={`retro-button rounded-none px-3 py-1 text-xs font-bold uppercase ${terrain ? 'retro-button-orange' : ''}`}
        >
          3D
        </button>
      </div>
      <p className="absolute bottom-2 left-3 right-3 z-10 bg-white/90 px-2 py-1 text-[11px] leading-snug text-gray-800 retro-box-inset">
        {attribution}
        {picking ? ' Click the map to drop a pin.' : ' Drag to move. Right-drag turns the map when 3D is on.'}
      </p>
    </div>
  );
}
