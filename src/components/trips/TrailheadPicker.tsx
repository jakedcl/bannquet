'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MlMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl('/maplibre-gl-worker.mjs');

import { MAP_CENTER, OPENFREEMAP_STYLE_URL } from '@/lib/map';

export function TrailheadPicker() {
  const ref = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState(MAP_CENTER);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [MAP_CENTER.lng, MAP_CENTER.lat],
      zoom: 7,
      attributionControl: false,
    });
    const marker = new Marker({ color: '#c0392b' }).setLngLat([MAP_CENTER.lng, MAP_CENTER.lat]).addTo(map);
    map.on('click', (event) => {
      const next = { lat: event.lngLat.lat, lng: event.lngLat.lng };
      marker.setLngLat([next.lng, next.lat]);
      setPoint(next);
    });
    const frame = requestAnimationFrame(() => map.resize());
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-64 w-full" />
      <input type="hidden" name="lat" value={point.lat} />
      <input type="hidden" name="lng" value={point.lng} />
      <p className="text-sm text-gray-700">
        Trailhead pin: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}. Click the map to move it.
      </p>
    </div>
  );
}
