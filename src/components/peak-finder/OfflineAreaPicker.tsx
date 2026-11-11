'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map as MlMap,
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
import { OFFLINE_MAX_RADIUS_M, OFFLINE_MIN_RADIUS_M } from '@/lib/peak-finder/constants';
import { formatOfflineSize, offlineManifestResolved, suggestAreaName } from '@/lib/peak-finder/offline';

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

const SATELLITE_STYLE = rasterStyle(USGS_IMAGERY_TOPO_TILES, 'Map and imagery: USGS National Map (public domain)');
const TOPO_STYLE = rasterStyle(USGS_TOPO_TILES, BASEMAP_ATTRIBUTION.topo);

function collapseAttribution(map: MlMap) {
  const el = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (el?.classList.contains('maplibregl-compact')) {
    el.classList.remove('maplibregl-compact-show');
  }
}

function squareSidePx(map: MlMap, lat: number, lng: number, radiusM: number): { width: number; height: number } {
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLat = radiusM / 110_574;
  const dLng = radiusM / (111_320 * Math.max(0.2, cos));
  const nw = map.project([lng - dLng, lat + dLat]);
  const se = map.project([lng + dLng, lat - dLat]);
  return { width: Math.abs(se.x - nw.x), height: Math.abs(se.y - nw.y) };
}

export function OfflineAreaPicker({
  initialLat,
  initialLng,
  radiusM,
  onRadiusM,
  name,
  onName,
  onCenter,
  onBack,
  downloading,
}: {
  initialLat: number;
  initialLng: number;
  radiusM: number;
  onRadiusM: (radius: number) => void;
  name: string;
  onName: (name: string) => void;
  onCenter: (spot: { lat: number; lng: number }) => void;
  onBack: () => void;
  downloading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const onCenterRef = useRef(onCenter);
  const [basemap, setBasemap] = useState<SpotBasemap>('satellite');
  const basemapRef = useRef(basemap);
  const [box, setBox] = useState({ width: 120, height: 120 });
  const [estimate, setEstimate] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const centerRef = useRef({ lat: initialLat, lng: initialLng });
  const nameSuggested = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCenterRef.current = onCenter;
  }, [onCenter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new MlMap({
      container,
      style: SATELLITE_STYLE,
      center: [initialLng, initialLat],
      zoom: 8.4,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'top-right');
    const syncAttribution = () => collapseAttribution(map);
    map.on('load', syncAttribution);
    map.on('resize', syncAttribution);
    const updateBox = () => {
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lng: c.lng };
      setBox(squareSidePx(map, c.lat, c.lng, radiusM));
      onCenterRef.current(centerRef.current);
    };
    map.on('move', updateBox);
    map.on('moveend', () => {
      updateBox();
      void offlineManifestResolved(centerRef.current.lat, centerRef.current.lng, radiusM).then((manifest) => {
        setEstimate(formatOfflineSize(manifest.estimatedBytes));
        setDetail(`${manifest.tileCount} terrain tiles, ${manifest.chunkCount} peak lists`);
      });
      if (!nameSuggested.current) {
        nameSuggested.current = true;
        void suggestAreaName(centerRef.current.lat, centerRef.current.lng).then(onName);
      }
    });
    mapRef.current = map;
    map.once('idle', () => {
      updateBox();
      map.fire('moveend');
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
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
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setBox(squareSidePx(map, c.lat, c.lng, radiusM));
    void offlineManifestResolved(c.lat, c.lng, radiusM).then((manifest) => {
      setEstimate(formatOfflineSize(manifest.estimatedBytes));
      setDetail(`${manifest.tileCount} terrain tiles, ${manifest.chunkCount} peak lists`);
    });
  }, [radiusM]);

  async function centerOnUser() {
    setError(null);
    if (!navigator.geolocation) return;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15_000,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      mapRef.current?.flyTo({ center: [lng, lat], duration: 800 });
      nameSuggested.current = false;
      void suggestAreaName(lat, lng).then(onName);
    } catch {
      setError('Could not read your location.');
    }
  }

  const radiusKm = radiusM / 1000;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#e7e1d4] text-[#1a1a1a]">
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border-4 border-[#ffc94d] bg-[#2d5016]/15 shadow-[0_0_0_9999px_rgba(26,26,26,0.35)]"
          style={{ width: box.width, height: box.height }}
          aria-hidden
        />
        <button type="button" className="retro-button absolute left-2 top-2 z-30 min-h-11 px-3 text-xs" onClick={onBack}>
          Back
        </button>
        <p className="pointer-events-none absolute left-1/2 top-14 z-20 w-[min(20rem,calc(100%-1rem))] -translate-x-1/2 bg-[#1a1a1a]/75 px-2 py-1 text-center text-xs font-bold text-white">
          Pan and zoom so the box covers what you want offline ({radiusKm} km from center).
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t-2 border-[#5c3a1e] p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="retro-button min-h-11 flex-1 px-3 text-xs" onClick={() => void centerOnUser()}>
            Use my current location
          </button>
          <button
            type="button"
            className={`retro-button min-h-11 px-3 text-xs ${basemap === 'satellite' ? 'retro-button-yellow' : ''}`}
            onClick={() => setBasemap('satellite')}
          >
            Satellite
          </button>
          <button
            type="button"
            className={`retro-button min-h-11 px-3 text-xs ${basemap === 'map' ? 'retro-button-yellow' : ''}`}
            onClick={() => setBasemap('map')}
          >
            Topo
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Area size (km from center)
          <input
            type="range"
            min={OFFLINE_MIN_RADIUS_M / 1000}
            max={OFFLINE_MAX_RADIUS_M / 1000}
            step={5}
            value={radiusKm}
            disabled={downloading}
            onChange={(e) => onRadiusM(Number(e.target.value) * 1000)}
          />
          <span className="font-normal">{radiusKm} km — box is about {radiusKm * 2} km wide</span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Name
          <input
            type="text"
            className="retro-inset min-h-10 px-2 text-sm font-normal"
            value={name}
            disabled={downloading}
            onChange={(e) => onName(e.target.value)}
          />
        </label>
        <p className="text-center text-sm">
          Estimated download: <span className="font-bold">{estimate ?? '…'}</span>
          {detail ? <span className="block text-xs font-normal">{detail}</span> : null}
        </p>
        {error ? <p className="text-sm font-bold text-red-900">{error}</p> : null}
      </div>
    </div>
  );
}
