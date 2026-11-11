'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map as MlMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  BASEMAP_ATTRIBUTION,
  USGS_IMAGERY_TOPO_TILES,
  USGS_TOPO_TILES,
} from '@/lib/map';

setWorkerUrl('/maplibre-gl-worker.mjs');

type SpotBasemap = 'satellite' | 'map';

function rasterStyle(tiles: string, attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        maxzoom: 16,
        attribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

const USGS_SPOT_ATTRIBUTION = 'Map and imagery: USGS National Map (public domain)';
const SATELLITE_STYLE = rasterStyle(USGS_IMAGERY_TOPO_TILES, USGS_SPOT_ATTRIBUTION);
const TOPO_STYLE = rasterStyle(USGS_TOPO_TILES, BASEMAP_ATTRIBUTION.topo);

/** MapLibre opens compact attribution on wide canvases; keep the (i) only until tap. */
function collapseAttribution(map: MlMap) {
  const el = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (el?.classList.contains('maplibregl-compact')) {
    el.classList.remove('maplibregl-compact-show');
  }
}

function BasemapToggle({
  basemap,
  onBasemap,
}: {
  basemap: SpotBasemap;
  onBasemap: (next: SpotBasemap) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className={`retro-button min-h-11 px-3 text-xs ${basemap === 'satellite' ? 'retro-button-yellow' : ''}`}
        aria-pressed={basemap === 'satellite'}
        onClick={() => onBasemap('satellite')}
      >
        Satellite
      </button>
      <button
        type="button"
        className={`retro-button min-h-11 px-3 text-xs ${basemap === 'map' ? 'retro-button-yellow' : ''}`}
        aria-pressed={basemap === 'map'}
        onClick={() => onBasemap('map')}
      >
        Topo
      </button>
    </div>
  );
}

export function SpotPicker({
  lat,
  lng,
  onChange,
  onBack,
}: {
  lat: number;
  lng: number;
  onChange: (spot: { lat: number; lng: number }) => void;
  onBack?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const basemapRef = useRef<SpotBasemap>('satellite');
  const [basemap, setBasemap] = useState<SpotBasemap>('satellite');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new MlMap({
      container,
      style: SATELLITE_STYLE,
      center: [lng, lat],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'top-right');
    const syncAttribution = () => collapseAttribution(map);
    map.on('load', syncAttribution);
    map.on('resize', syncAttribution);
    requestAnimationFrame(syncAttribution);
    const marker = new Marker({ color: '#ffb300' }).setLngLat([lng, lat]).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;
    map.on('click', (event) => {
      const spot = { lat: event.lngLat.lat, lng: event.lngLat.lng };
      marker.setLngLat([spot.lng, spot.lat]);
      onChangeRef.current(spot);
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    const frame = requestAnimationFrame(() => map.resize());
    return () => {
      cancelAnimationFrame(frame);
      map.off('load', syncAttribution);
      map.off('resize', syncAttribution);
      observer.disconnect();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
    // Create the map once for this visit to the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || basemapRef.current === basemap) return;
    basemapRef.current = basemap;
    map.setStyle(basemap === 'satellite' ? SATELLITE_STYLE : TOPO_STYLE);
    map.once('idle', () => collapseAttribution(map));
  }, [basemap]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-2 right-14 top-2 z-20 flex flex-wrap items-center gap-2">
        {onBack ? (
          <button type="button" className="retro-button pointer-events-auto min-h-11 shrink-0 px-3 text-xs" onClick={onBack}>
            Back
          </button>
        ) : null}
        <div className="pointer-events-auto">
          <BasemapToggle basemap={basemap} onBasemap={setBasemap} />
        </div>
      </div>
    </div>
  );
}
