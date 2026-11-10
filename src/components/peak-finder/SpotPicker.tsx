'use client';

import { useEffect, useRef } from 'react';
import { Map as MlMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OPENFREEMAP_STYLE_URL } from '@/lib/map';

setWorkerUrl('/maplibre-gl-worker.mjs');

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
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [lng, lat],
      zoom: 8,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    const marker = new Marker({ color: '#2d5016' }).setLngLat([lng, lat]).addTo(map);
    markerRef.current = marker;
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
      map.remove();
    };
    // Create the map once for this visit to the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return <div ref={containerRef} className="h-full w-full" />;
}
