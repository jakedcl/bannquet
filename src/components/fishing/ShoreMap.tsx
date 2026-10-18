'use client';

import { useEffect, useRef } from 'react';
import { Map as MlMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OPENFREEMAP_STYLE_URL } from '@/lib/map';

setWorkerUrl('/maplibre-gl-worker.mjs');

export default function ShoreMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [lon, lat],
      zoom: 13,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('spot', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: { name },
        },
      });
      map.addLayer({
        id: 'spot',
        type: 'circle',
        source: 'spot',
        paint: {
          'circle-radius': 7,
          'circle-color': '#1f4e9c',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1a1a1a',
        },
      });
    });
    const frame = requestAnimationFrame(() => map.resize());
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, name]);

  return <div ref={containerRef} className="h-64 w-full md:h-80" />;
}
