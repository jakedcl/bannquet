'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Map as MlMap,
  NavigationControl,
  setWorkerUrl,
  type FilterSpecification,
  type GeoJSONSource,
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

function leafFromFeature(feature: { geometry: unknown; properties?: GeoJSON.GeoJsonProperties }): Leaf | null {
  const geometry = feature.geometry as { type?: string; coordinates?: unknown };
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as number[];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return {
    title: String(props.title ?? 'Pin'),
    who: String(props.who ?? 'Friend'),
    date: props.date ? String(props.date) : null,
    activity: props.activity ? String(props.activity) : null,
    color: String(props.color ?? '#444444'),
    trackId: String(props.trackId ?? ''),
    href: String(props.href ?? '/map'),
    lng,
    lat,
  };
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
  const selectedRef = useRef('');
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  const [basemap, setBasemap] = useState<BasemapId>('standard');
  const [layersOpen, setLayersOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [terrain, setTerrain] = useState(false);
  const [leaves, setLeaves] = useState<Leaf[] | null>(null);
  const [selectedTrack, setSelectedTrack] = useState('');

  useEffect(() => {
    pointsRef.current = points;
    linesRef.current = lines;
    selectedRef.current = selectedTrack;
    pickingRef.current = picking;
    onPickRef.current = onPick;
  }, [lines, onPick, picking, points, selectedTrack]);

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
      const layers = ['clusters', 'pins'].filter((id) => Boolean(map.getLayer(id)));
      const hits = layers.length > 0 ? map.queryRenderedFeatures(event.point, { layers }) : [];
      if (hits.length > 0) return;
      pick(event.lngLat.lng, event.lngLat.lat);
    });

    return () => {
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
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      syncRoutes(map);
    };

    const syncRoutes = (target: MlMap) => {
      if (!target.getLayer('routes') || !target.getSource('places')) return;
      const rendered = target.querySourceFeatures('places');
      const ids = new Set<string>();
      for (const feature of rendered) {
        const props = feature.properties ?? {};
        if (props.point_count || props.cluster) continue;
        if (props.trackId) ids.add(String(props.trackId));
      }
      if (selectedRef.current) ids.add(selectedRef.current);
      const list = [...ids];
      const filter: FilterSpecification = list.length
        ? ['in', ['get', 'trackId'], ['literal', list]]
        : ['==', ['get', 'trackId'], ''];
      target.setFilter('routes', filter);
    };

    const onCluster = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource('places') as GeoJSONSource | undefined;
      if (!source || clusterId == null) return;
      const children = await source.getClusterLeaves(Number(clusterId), 40, 0);
      setLeaves(children.map(leafFromFeature).filter((leaf): leaf is Leaf => Boolean(leaf)));
      setSelectedTrack('');
    };
    const onPin = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const leaf = leafFromFeature(feature);
      setLeaves(leaf ? [leaf] : null);
      setSelectedTrack(leaf?.trackId ?? '');
    };

    map.on('style.load', draw);
    map.on('moveend', () => syncRoutes(map));
    map.on('click', 'clusters', onCluster);
    map.on('click', 'pins', onPin);
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });
    map.on('mouseenter', 'pins', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pins', () => { map.getCanvas().style.cursor = picking ? 'crosshair' : ''; });
    if (map.isStyleLoaded()) draw();

    return () => {
      map.off('style.load', draw);
      map.off('click', 'clusters', onCluster);
      map.off('click', 'pins', onPin);
    };
  }, [terrain, basemap, picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource('places')) return;
    (map.getSource('places') as GeoJSONSource).setData(points);
    (map.getSource('routes') as GeoJSONSource).setData(lines);
  }, [points, lines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTrack || !map.getLayer('routes')) return;
    const rendered = map.querySourceFeatures('places');
    const ids = new Set(rendered.flatMap((feature) => {
      const trackId = feature.properties?.trackId;
      return feature.properties?.point_count || !trackId ? [] : [String(trackId)];
    }));
    ids.add(selectedTrack);
    map.setFilter('routes', ['in', ['get', 'trackId'], ['literal', [...ids]]]);
  }, [selectedTrack]);

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
    <div className={`relative h-full min-h-[420px] ${className}`}>
      <div ref={containerRef} className={`h-full w-full ${picking ? 'cursor-crosshair' : ''}`} />
      <div ref={controlsRef} className="absolute left-3 top-3 z-10 flex items-start gap-2">
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
      {leaves && leaves.length > 0 ? (
        <div className="absolute bottom-12 left-3 z-10 max-h-[45%] w-[min(100%-1.5rem,22rem)] overflow-auto bg-beige p-3 retro-box">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase">
              {leaves.length === 1 ? '1 stop' : `${leaves.length} stops here`}
            </p>
            <button type="button" className="text-xs font-bold uppercase underline" onClick={() => setLeaves(null)}>
              Close
            </button>
          </div>
          <div className="space-y-2">
            {leaves.map((leaf) => (
              <a
                key={`${leaf.href}-${leaf.title}-${leaf.lng}`}
                href={leaf.href}
                onClick={() => {
                  if (!leaf.trackId) return;
                  setSelectedTrack(leaf.trackId);
                  mapRef.current?.flyTo({ center: [leaf.lng, leaf.lat], zoom: 13, essential: true });
                }}
                className="block bg-white p-2 retro-box-inset"
              >
                <span className="mb-1 inline-block h-2 w-2" style={{ background: leaf.color }} />
                <span className="ml-2 text-sm font-bold">{leaf.title}</span>
                <span className="mt-1 block text-xs text-gray-700">
                  {leaf.who} · {formatTripDate(leaf.date)} · {activityLabel(leaf.activity)}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
