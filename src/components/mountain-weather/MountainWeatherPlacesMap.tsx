'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { LngLatBounds, Map as MlMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CENTER, NEUTRAL_PIN_COLOR, OPENFREEMAP_STYLE_URL } from '@/lib/map';
import type { NwsAlertsBundle, PlaceMapPin } from '@/lib/mountain-weather/map-types';

setWorkerUrl('/maplibre-gl-worker.mjs');

const MapShell = forwardRef<HTMLDivElement>(function MapShell(_, ref) {
  return <div ref={ref} className="h-[min(60vh,28rem)] w-full border border-[#5c3a1e]/40" />;
});

type Props = {
  pins: PlaceMapPin[];
  alertMap?: NwsAlertsBundle | null;
  focus?: { lat: number; lon: number; zoom?: number } | null;
  className?: string;
};

export function MountainWeatherPlacesMap({ pins, alertMap, focus, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MlMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: [MAP_CENTER.lng, MAP_CENTER.lat],
      zoom: 6,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      if (alertMap?.mapGeoJson.features.length) {
        map.addSource('nws-alerts', { type: 'geojson', data: alertMap.mapGeoJson });
        map.addLayer({
          id: 'nws-alerts-fill',
          type: 'fill',
          source: 'nws-alerts',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.35,
          },
        });
        map.addLayer({
          id: 'nws-alerts-line',
          type: 'line',
          source: 'nws-alerts',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
          },
        });
        map.on('click', 'nws-alerts-fill', (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const props = feature.properties as { event?: string; validLabel?: string; headline?: string };
          new Popup()
            .setLngLat(event.lngLat)
            .setHTML(
              `<div class="text-sm"><strong>${props.event ?? 'Alert'}</strong><br/>${props.headline ?? ''}<br/><span class="text-xs">${props.validLabel ?? ''}</span></div>`,
            )
            .addTo(map);
        });
        map.on('mouseenter', 'nws-alerts-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'nws-alerts-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      const placesGeo: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: pins.map((pin) => ({
          type: 'Feature',
          properties: {
            placeId: pin.placeId,
            title: pin.title,
            href: pin.href,
            phrase: pin.phrase,
            alert: pin.alert,
            high: pin.high,
            low: pin.low,
            wind: pin.wind,
          },
          geometry: { type: 'Point', coordinates: [pin.lon, pin.lat] },
        })),
      };
      map.addSource('mw-places', { type: 'geojson', data: placesGeo, cluster: true, clusterMaxZoom: 10, clusterRadius: 36 });
      map.addLayer({
        id: 'mw-places-cluster',
        type: 'circle',
        source: 'mw-places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': NEUTRAL_PIN_COLOR,
          'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 50, 22],
        },
      });
      map.addLayer({
        id: 'mw-places-point',
        type: 'circle',
        source: 'mw-places',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#8b4513', 'circle-radius': 6, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' },
      });

      map.on('click', 'mw-places-point', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as PlaceMapPin & { placeId: string };
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        const lines = [
          props.phrase,
          props.high != null && props.low != null ? `High ${props.high}° · Low ${props.low}°` : null,
          props.wind ? `Wind ${props.wind}` : null,
          props.alert ? `Alert: ${props.alert}` : null,
        ].filter(Boolean);
        new Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="text-sm"><a class="font-bold underline" href="${props.href}">${props.title}</a><p class="mt-1">${lines.join('<br/>')}</p></div>`,
          )
          .addTo(map);
      });
      map.on('mouseenter', 'mw-places-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'mw-places-point', () => {
        map.getCanvas().style.cursor = '';
      });

      if (focus) {
        map.jumpTo({ center: [focus.lon, focus.lat], zoom: focus.zoom ?? 9 });
      } else if (pins.length) {
        const coords = pins.map((p) => [p.lon, p.lat] as [number, number]);
        const bounds = coords.reduce((b, c) => b.extend(c), new LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 32, maxZoom: 8, animate: false });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pins, alertMap, focus]);

  return (
    <div className={className}>
      <p className="mb-2 text-xs text-gray-700">
        Basemap: OpenFreeMap (OSM). Active NWS alerts are filled polygons (alert geometry or forecast-zone polygons from api.weather.gov/zones). Pin data matches place-page baselines.
      </p>
      {alertMap?.legend.length ? (
        <ul className="mb-2 flex flex-wrap gap-2 text-[10px]">
          {alertMap.legend.map((row) => (
            <li key={row.event} className="flex items-center gap-1 border border-[#5c3a1e]/30 bg-white px-1.5 py-0.5">
              <span className="inline-block h-2.5 w-2.5 border border-black/20" style={{ background: row.color }} />
              {row.event}
            </li>
          ))}
        </ul>
      ) : null}
      <MapShell ref={containerRef} />
    </div>
  );
}