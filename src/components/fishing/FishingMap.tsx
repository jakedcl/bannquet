'use client';

import { useEffect, useRef } from 'react';
import { type GeoJSONSource, LngLatBounds, Map as MlMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FreshwaterKind, FreshwaterRow } from '@/lib/fishing/freshwater-rows';
import { MAP_CENTER, OPENFREEMAP_STYLE_URL } from '@/lib/map';
import type { ParkingArea } from '@/lib/fishing/pfr';
import { WATER_PIN_COLOR } from '@/lib/fishing/water-places';

setWorkerUrl('/maplibre-gl-worker.mjs');

export type MapPlace = Pick<FreshwaterRow, 'id' | 'kind' | 'name' | 'status' | 'href' | 'external' | 'site'> & {
  lat: number;
  lon: number;
};

type PointCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, string>;
  }>;
};

const LAYERS: { id: FreshwaterKind; radius: number }[] = [
  { id: 'Lake', radius: 7 },
  { id: 'River', radius: 5 },
  { id: 'Stocking', radius: 4 },
];

function collection(features: PointCollection['features']): PointCollection {
  return { type: 'FeatureCollection', features };
}

function placePoints(places: MapPlace[], kind: FreshwaterKind): PointCollection {
  return collection(
    places.flatMap((place) => {
      if (place.kind !== kind) return [];
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [place.lon, place.lat] as [number, number] },
        properties: {
          id: place.id,
          kind: place.kind,
          name: place.name,
          status: place.status ?? '',
          href: place.href ?? '',
          external: place.external ? 'true' : 'false',
          site: place.site ?? '',
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

function placePopup(properties: Record<string, string>): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';
  line(root, properties.name || 'Water', 'pr-6 font-bold');
  if (properties.kind) line(root, properties.kind, 'text-gray-700');
  if (properties.status) line(root, properties.status, '');
  if (properties.href) {
    const link = document.createElement('a');
    link.href = properties.href;
    if (properties.external === 'true') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.className = 'block font-bold underline';
    link.textContent = properties.external === 'true' ? 'Site' : 'Page';
    root.append(link);
  }
  return root;
}

function fit(map: MlMap, places: MapPlace[], parking: ParkingArea[], showParking: boolean) {
  const bounds = new LngLatBounds();
  for (const place of places) bounds.extend([place.lon, place.lat]);
  if (showParking) {
    for (const area of parking) {
      if (area.lat != null && area.lon != null) bounds.extend([area.lon, area.lat]);
    }
  }
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 36, maxZoom: 9 });
}

export default function FishingMap({
  places,
  parking,
  showParking,
  onSelect,
}: {
  places: MapPlace[];
  parking: ParkingArea[];
  showParking: boolean;
  onSelect: (site: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const placesRef = useRef(places);
  const parkingRef = useRef(parking);
  const showParkingRef = useRef(showParking);

  useEffect(() => {
    onSelectRef.current = onSelect;
    placesRef.current = places;
    parkingRef.current = parking;
    showParkingRef.current = showParking;
  }, [onSelect, parking, places, showParking]);

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
      map.addSource('parking', { type: 'geojson', data: parkingPoints(parkingRef.current) });
      map.addLayer({
        id: 'parking',
        type: 'circle',
        source: 'parking',
        layout: { visibility: showParkingRef.current ? 'visible' : 'none' },
        paint: {
          'circle-radius': 4,
          'circle-color': WATER_PIN_COLOR.parking,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1a1a1a',
        },
      });
      for (const layer of LAYERS) {
        map.addSource(layer.id, { type: 'geojson', data: placePoints(placesRef.current, layer.id) });
        map.addLayer({
          id: layer.id,
          type: 'circle',
          source: layer.id,
          paint: {
            'circle-radius': layer.radius,
            'circle-color': WATER_PIN_COLOR[layer.id],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#1a1a1a',
          },
        });
      }

      map.on('click', 'River', (event) => {
        const site = event.features?.[0]?.properties?.site;
        if (typeof site === 'string' && site) onSelectRef.current(site);
      });
      for (const layer of ['Lake', 'Stocking'] as const) {
        map.on('click', layer, (event) => {
          const properties = event.features?.[0]?.properties;
          if (!properties) return;
          popupRef.current?.remove();
          popupRef.current = new Popup({ closeButton: true, maxWidth: '18rem', className: 'bnqt-popup', offset: 8 })
            .setLngLat(event.lngLat)
            .setDOMContent(placePopup(properties as Record<string, string>))
            .addTo(map);
        });
      }
      map.on('click', 'parking', (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) return;
        popupRef.current?.remove();
        popupRef.current = new Popup({ closeButton: true, maxWidth: '18rem', className: 'bnqt-popup', offset: 8 })
          .setLngLat(event.lngLat)
          .setDOMContent(parkingPopup(properties as Record<string, string>))
          .addTo(map);
      });
      for (const layer of ['River', 'Lake', 'Stocking', 'parking']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      fit(map, placesRef.current, parkingRef.current, showParkingRef.current);
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
    if (!map?.isStyleLoaded() || !map.getSource('River')) return;
    for (const layer of LAYERS) {
      (map.getSource(layer.id) as GeoJSONSource | undefined)?.setData(placePoints(places, layer.id));
    }
    (map.getSource('parking') as GeoJSONSource | undefined)?.setData(parkingPoints(parking));
    if (map.getLayer('parking')) {
      map.setLayoutProperty('parking', 'visibility', showParking ? 'visible' : 'none');
    }
    fit(map, places, parking, showParking);
  }, [parking, places, showParking]);

  return <div ref={containerRef} className="h-96 w-full" />;
}
