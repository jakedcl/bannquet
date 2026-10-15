'use client';

import { useEffect, useRef } from 'react';
import { type GeoJSONSource, LngLatBounds, Map as MlMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CENTER, OPENFREEMAP_STYLE_URL } from '@/lib/map';
import type { ParkingArea } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';

setWorkerUrl('/maplibre-gl-worker.mjs');

type PointCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, string>;
  }>;
};

function collection(features: PointCollection['features']): PointCollection {
  return { type: 'FeatureCollection', features };
}

function gaugePoints(gauges: GaugeView[]): PointCollection {
  return collection(
    gauges.flatMap((gauge) => {
      if (gauge.lat == null || gauge.lon == null) return [];
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [gauge.lon, gauge.lat] as [number, number] },
        properties: {
          site: gauge.site,
          name: gauge.name,
          region: gauge.region,
        },
      }];
    }),
  );
}

function parkingPoints(areas: ParkingArea[]): PointCollection {
  return collection(
    areas.flatMap((area) => {
      if (area.lat == null || area.lon == null) return [];
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [area.lon, area.lat] as [number, number] },
        properties: {
          water: area.water,
          town: area.town ?? '',
          county: area.county ?? '',
          road: area.road ?? '',
          parkingNumber: area.parkingNumber ?? '',
          stocked: area.stocked ?? '',
          troutPresent: area.troutPresent ?? '',
          mapHref: area.mapHref ?? '',
          rulesHref: area.rulesHref ?? '',
        },
      }];
    }),
  );
}

function line(parent: HTMLElement, text: string, className: string) {
  const node = document.createElement('p');
  node.className = className;
  node.textContent = text;
  parent.append(node);
}

function parkingPopup(properties: Record<string, string>): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';
  line(root, properties.water || 'Parking', 'pr-6 font-bold');
  const place = [properties.town, properties.county].filter(Boolean).join(', ');
  if (place) line(root, place, 'text-gray-700');
  if (properties.road) line(root, properties.road, 'text-gray-700');
  if (properties.parkingNumber) line(root, `Parking ${properties.parkingNumber}`, 'text-gray-700');
  if (properties.stocked) line(root, `Stocked: ${properties.stocked}`, '');
  if (properties.troutPresent) line(root, `Trout present: ${properties.troutPresent}`, '');
  for (const [href, label] of [
    [properties.mapHref, 'PDF map'],
    [properties.rulesHref, 'Special regulations'],
  ] as const) {
    if (!href) continue;
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'block font-bold underline';
    link.textContent = label;
    root.append(link);
  }
  return root;
}

export default function FishingMap({
  gauges,
  parking,
  selected,
  showParking,
  onSelect,
}: {
  gauges: GaugeView[];
  parking: ParkingArea[];
  selected: string | null;
  showParking: boolean;
  onSelect: (site: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const gaugesRef = useRef(gauges);
  const parkingRef = useRef(parking);
  const selectedRef = useRef(selected);
  const showParkingRef = useRef(showParking);

  useEffect(() => {
    onSelectRef.current = onSelect;
    gaugesRef.current = gauges;
    parkingRef.current = parking;
    selectedRef.current = selected;
    showParkingRef.current = showParking;
  }, [gauges, onSelect, parking, selected, showParking]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MlMap({
      container,
      style: OPENFREEMAP_STYLE_URL,
      center: [MAP_CENTER.lng, MAP_CENTER.lat],
      zoom: 6,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('gauges', { type: 'geojson', data: gaugePoints(gaugesRef.current) });
      map.addSource('parking', { type: 'geojson', data: parkingPoints(parkingRef.current) });
      map.addLayer({
        id: 'parking',
        type: 'circle',
        source: 'parking',
        layout: { visibility: showParkingRef.current ? 'visible' : 'none' },
        paint: {
          'circle-radius': 4,
          'circle-color': '#8a5a2a',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1a1a1a',
        },
      });
      map.addLayer({
        id: 'gauges',
        type: 'circle',
        source: 'gauges',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'site'], selectedRef.current ?? ''], 8, 5],
          'circle-color': ['case', ['==', ['get', 'site'], selectedRef.current ?? ''], '#ffd700', '#1e4d2b'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1a1a1a',
        },
      });

      const bounds = new LngLatBounds();
      for (const gauge of gaugesRef.current) {
        if (gauge.lat != null && gauge.lon != null) bounds.extend([gauge.lon, gauge.lat]);
      }
      for (const area of parkingRef.current) {
        if (area.lat != null && area.lon != null) bounds.extend([area.lon, area.lat]);
      }
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 36, maxZoom: 9 });
    });

    map.on('click', 'gauges', (event) => {
      const site = event.features?.[0]?.properties?.site;
      if (typeof site === 'string' && site) onSelectRef.current(site);
    });
    map.on('click', 'parking', (event) => {
      const feature = event.features?.[0];
      const properties = feature?.properties;
      if (!properties) return;
      popupRef.current?.remove();
      const popup = new Popup({ closeButton: true, maxWidth: '18rem', className: 'bnqt-popup', offset: 8 })
        .setLngLat(event.lngLat)
        .setDOMContent(parkingPopup(properties as Record<string, string>))
        .addTo(map);
      popupRef.current = popup;
    });
    map.on('mouseenter', 'gauges', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'gauges', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'parking', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'parking', () => {
      map.getCanvas().style.cursor = '';
    });

    const frame = requestAnimationFrame(() => map.resize());
    return () => {
      cancelAnimationFrame(frame);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource('gauges') as GeoJSONSource | undefined)?.setData(gaugePoints(gauges));
    (map.getSource('parking') as GeoJSONSource | undefined)?.setData(parkingPoints(parking));
    if (map.getLayer('gauges')) {
      map.setPaintProperty('gauges', 'circle-radius', ['case', ['==', ['get', 'site'], selected ?? ''], 8, 5]);
      map.setPaintProperty('gauges', 'circle-color', ['case', ['==', ['get', 'site'], selected ?? ''], '#ffd700', '#1e4d2b']);
    }
    if (map.getLayer('parking')) {
      map.setLayoutProperty('parking', 'visibility', showParking ? 'visible' : 'none');
    }
  }, [gauges, parking, selected, showParking]);

  return <div ref={containerRef} className="h-96 w-full" />;
}
