'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AttributionControl,
  LngLatBounds,
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
import { formatOfflineSize, offlineManifestResolved } from '@/lib/peak-finder/offline';
import { boxFitsViewport, offlineSaveBounds } from '@/lib/peak-finder/offline-area-picker-map';
import { PeakFinderBackButton } from './PeakFinderBackButton';

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

const BOX_VIEW_PADDING_PX = 32;

function squareSidePx(map: MlMap, lat: number, lng: number, radiusM: number): { width: number; height: number } {
  const { west, south, east, north } = offlineSaveBounds(lat, lng, radiusM);
  const nw = map.project([west, north]);
  const se = map.project([east, south]);
  return { width: Math.abs(se.x - nw.x), height: Math.abs(se.y - nw.y) };
}

function fitBoxInView(map: MlMap, lat: number, lng: number, radiusM: number, animated = false, onDone?: () => void) {
  const { west, south, east, north } = offlineSaveBounds(lat, lng, radiusM);
  const bounds = new LngLatBounds([west, south], [east, north]);
  map.resize();
  map.fitBounds(bounds, {
    padding: BOX_VIEW_PADDING_PX,
    duration: animated ? 350 : 0,
    maxZoom: 13,
  });
  if (onDone) map.once('moveend', onDone);
}

function boxVisibleInView(map: MlMap, lat: number, lng: number, radiusM: number): boolean {
  const { width, height } = squareSidePx(map, lat, lng, radiusM);
  const el = map.getContainer();
  return boxFitsViewport(width, height, el.clientWidth, el.clientHeight, BOX_VIEW_PADDING_PX);
}

function BoxSelectionOverlay({ box }: { box: { width: number; height: number } }) {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  return (
    <>
      <div className="absolute inset-x-0 top-0 bg-[#1a1a1a]/28" style={{ height: `calc(50% - ${halfH}px)` }} />
      <div className="absolute inset-x-0 bottom-0 bg-[#1a1a1a]/28" style={{ height: `calc(50% - ${halfH}px)` }} />
      <div
        className="absolute left-0 bg-[#1a1a1a]/28"
        style={{
          top: `calc(50% - ${halfH}px)`,
          width: `calc(50% - ${halfW}px)`,
          height: box.height,
        }}
      />
      <div
        className="absolute right-0 bg-[#1a1a1a]/28"
        style={{
          top: `calc(50% - ${halfH}px)`,
          width: `calc(50% - ${halfW}px)`,
          height: box.height,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 box-border -translate-x-1/2 -translate-y-1/2 border-[3px] border-[#ffc94d] bg-[#2d5016]/12"
        style={{ width: box.width, height: box.height }}
      />
    </>
  );
}

function mountDimOverlayHost(map: MlMap): HTMLDivElement {
  const mapEl = map.getContainer();
  const host = document.createElement('div');
  host.setAttribute('data-offline-picker-dim', '');
  host.className = 'absolute inset-0 z-[1] overflow-hidden pointer-events-none';
  const controls = mapEl.querySelector('.maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-right');
  if (controls?.parentElement === mapEl) mapEl.insertBefore(host, controls);
  else mapEl.appendChild(host);
  return host;
}

export function OfflineAreaPicker({
  initialLat,
  initialLng,
  radiusM,
  onRadiusM,
  onCenter,
  onBack,
  downloading,
  onDownload,
}: {
  initialLat: number;
  initialLng: number;
  radiusM: number;
  onRadiusM: (radius: number) => void;
  onCenter: (spot: { lat: number; lng: number }) => void;
  onBack: () => void;
  downloading: boolean;
  onDownload: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const onCenterRef = useRef(onCenter);
  const [basemap, setBasemap] = useState<SpotBasemap>('satellite');
  const basemapRef = useRef(basemap);
  const [box, setBox] = useState({ width: 120, height: 120 });
  const [estimate, setEstimate] = useState<string | null>(null);
  const centerRef = useRef({ lat: initialLat, lng: initialLng });
  const radiusRef = useRef(radiusM);
  const userPannedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const fitWhenReadyRef = useRef<((map: MlMap) => void) | null>(null);
  const dimHostRef = useRef<HTMLDivElement | null>(null);
  const [dimPortal, setDimPortal] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  function scheduleFitWhenReady(
    map: MlMap,
    lat: number,
    lng: number,
    radius: number,
    animated = false,
    onDone?: () => void,
  ) {
    programmaticMoveRef.current = true;
    fitWhenReadyRef.current = (target) => {
      fitWhenReadyRef.current = null;
      target.resize();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitBoxInView(target, lat, lng, radius, animated, () => {
            programmaticMoveRef.current = false;
            onDone?.();
          });
        });
      });
    };
    if (map.loaded()) fitWhenReadyRef.current(map);
    else map.once('load', () => fitWhenReadyRef.current?.(map));
  }

  useEffect(() => {
    radiusRef.current = radiusM;
  }, [radiusM]);

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
      zoom: 4,
      attributionControl: false,
    });
    map.on('dragstart', () => {
      if (!programmaticMoveRef.current) userPannedRef.current = true;
    });
    map.on('zoomstart', () => {
      if (!programmaticMoveRef.current) userPannedRef.current = true;
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    const syncAttribution = () => collapseAttribution(map);
    map.on('load', () => {
      syncAttribution();
      const host = mountDimOverlayHost(map);
      dimHostRef.current = host;
      setDimPortal(host);
    });
    map.on('resize', syncAttribution);
    const updateBox = () => {
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lng: c.lng };
      setBox(squareSidePx(map, c.lat, c.lng, radiusM));
      onCenterRef.current(centerRef.current);
    };
    map.on('move', updateBox);
    const refreshEstimate = () => {
      void offlineManifestResolved(centerRef.current.lat, centerRef.current.lng, radiusM).then((manifest) => {
        setEstimate(formatOfflineSize(manifest.estimatedBytes));
      });
    };
    map.on('moveend', () => {
      updateBox();
      refreshEstimate();
    });
    mapRef.current = map;
    scheduleFitWhenReady(map, centerRef.current.lat, centerRef.current.lng, radiusRef.current, false, () => {
      updateBox();
      refreshEstimate();
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (userPannedRef.current) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          centerRef.current = { lat, lng };
          map.jumpTo({ center: [lng, lat] });
          scheduleFitWhenReady(map, lat, lng, radiusRef.current, false, () => {
            updateBox();
            refreshEstimate();
            onCenterRef.current(centerRef.current);
          });
        },
        () => {
          /* keep default center */
        },
        { enableHighAccuracy: false, maximumAge: 600_000, timeout: 12_000 },
      );
    }
    const observer = new ResizeObserver(() => {
      map.resize();
      if (fitWhenReadyRef.current) fitWhenReadyRef.current(map);
    });
    observer.observe(container);
    const frame = requestAnimationFrame(() => {
      map.resize();
      if (fitWhenReadyRef.current) fitWhenReadyRef.current(map);
      else updateBox();
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      dimHostRef.current?.remove();
      dimHostRef.current = null;
      setDimPortal(null);
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
    if (!boxVisibleInView(map, c.lat, c.lng, radiusM)) {
      programmaticMoveRef.current = true;
      fitBoxInView(map, c.lat, c.lng, radiusM, true, () => {
        programmaticMoveRef.current = false;
        updateBoxFromMap();
      });
    }
    void offlineManifestResolved(c.lat, c.lng, radiusM).then((manifest) => {
      setEstimate(formatOfflineSize(manifest.estimatedBytes));
    });

    function updateBoxFromMap() {
      const center = map!.getCenter();
      setBox(squareSidePx(map!, center.lat, center.lng, radiusM));
    }
  }, [radiusM]);

  async function centerOnUser() {
    setError(null);
    if (!navigator.geolocation) return;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 15_000,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const map = mapRef.current;
      if (!map) return;
      centerRef.current = { lat, lng };
      onCenterRef.current(centerRef.current);
      scheduleFitWhenReady(map, lat, lng, radiusM, true);
    } catch {
      setError('Location blocked.');
    }
  }

  const radiusKm = radiusM / 1000;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-[#e7e1d4] text-[#1a1a1a]">
      <div className="offline-area-picker-map relative min-h-0 w-full flex-1 basis-0 overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />
        {dimPortal ? createPortal(<BoxSelectionOverlay box={box} />, dimPortal) : null}
        <PeakFinderBackButton onClick={onBack} />
        <p className="pointer-events-none absolute inset-x-8 bottom-2 z-20 text-center text-[10px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          Pan the map — box = {radiusKm} km offline area
        </p>
      </div>
      <div className="shrink-0 space-y-1.5 border-t-2 border-[#5c3a1e] bg-[#e7e1d4]/95 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-[10px] text-[#3d3d3d]">
          Download ~<span className="font-bold text-[#1a1a1a]">{estimate ?? '…'}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="retro-button min-h-9 shrink-0 px-2 text-[10px]"
            title="Use my current location"
            onClick={() => void centerOnUser()}
          >
            Here
          </button>
          <div className="flex min-h-9 flex-1 overflow-hidden rounded border-2 border-[#5c3a1e]">
            <button
              type="button"
              className={`min-h-9 flex-1 px-1 text-[10px] ${basemap === 'satellite' ? 'bg-[#ffc94d] font-bold' : 'bg-[#e7e1d4]'}`}
              onClick={() => setBasemap('satellite')}
            >
              Sat
            </button>
            <button
              type="button"
              className={`min-h-9 flex-1 border-l-2 border-[#5c3a1e] px-1 text-[10px] ${basemap === 'map' ? 'bg-[#ffc94d] font-bold' : 'bg-[#e7e1d4]'}`}
              onClick={() => setBasemap('map')}
            >
              Topo
            </button>
          </div>
          <button
            type="button"
            className="retro-button retro-button-yellow min-h-9 shrink-0 px-2 text-[10px] font-bold"
            disabled={downloading}
            onClick={onDownload}
          >
            Download
          </button>
        </div>
        <input
          type="range"
          className="h-4 w-full"
          min={OFFLINE_MIN_RADIUS_M / 1000}
          max={OFFLINE_MAX_RADIUS_M / 1000}
          step={5}
          value={radiusKm}
          disabled={downloading}
          aria-label="Area radius in km"
          onChange={(e) => onRadiusM(Number(e.target.value) * 1000)}
        />
        {downloading ? (
          <p className="text-center text-[10px] font-bold text-[#2d5016]">Downloading…</p>
        ) : null}
        {error ? <p className="text-center text-[10px] font-bold text-red-900">{error}</p> : null}
      </div>
    </div>
  );
}
