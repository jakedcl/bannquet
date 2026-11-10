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
import { BASEMAP_ATTRIBUTION, OPENFREEMAP_STYLE_URL, USGS_IMAGERY_TILES } from '@/lib/map';

setWorkerUrl('/maplibre-gl-worker.mjs');

type SpotBasemap = 'satellite' | 'map';

/** USGS National Map imagery. Public domain, no key. */
function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      imagery: {
        type: 'raster',
        tiles: [USGS_IMAGERY_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: BASEMAP_ATTRIBUTION.satellite,
      },
    },
    layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
  };
}

export function SpotPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (spot: { lat: number; lng: number }) => void;
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
      style: satelliteStyle(),
      center: [lng, lat],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'top-right');
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
    map.setStyle(basemap === 'satellite' ? satelliteStyle() : OPENFREEMAP_STYLE_URL);
  }, [basemap]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          className={`retro-button min-h-11 px-3 text-xs ${basemap === 'satellite' ? 'retro-button-yellow' : ''}`}
          aria-pressed={basemap === 'satellite'}
          onClick={() => setBasemap('satellite')}
        >
          Satellite
        </button>
        <button
          type="button"
          className={`retro-button min-h-11 px-3 text-xs ${basemap === 'map' ? 'retro-button-yellow' : ''}`}
          aria-pressed={basemap === 'map'}
          onClick={() => setBasemap('map')}
        >
          Map
        </button>
      </div>
    </div>
  );
}
