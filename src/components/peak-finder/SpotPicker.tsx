'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
import { formatFeet } from '@/lib/peak-finder/format';
import { loadPeakCatalog, searchPeaks } from '@/lib/peak-finder/peak-search';
import type { Peak } from '@/lib/peak-finder/peaks';

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

  const listId = useId();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<Peak[] | null>(null);
  const [catalogState, setCatalogState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = catalog && query.trim().length >= 2 ? searchPeaks(catalog, query, 8) : [];

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
    map.setStyle(basemap === 'satellite' ? SATELLITE_STYLE : TOPO_STYLE);
  }, [basemap]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  function ensureCatalog() {
    if (catalogState !== 'idle') return;
    setCatalogState('loading');
    loadPeakCatalog()
      .then((peaks) => {
        setCatalog(peaks);
        setCatalogState('ready');
      })
      .catch(() => setCatalogState('error'));
  }

  function goToPeak(peak: Peak) {
    const map = mapRef.current;
    const marker = markerRef.current;
    const spot = { lat: peak.lat, lng: peak.lng };
    marker?.setLngLat([peak.lng, peak.lat]);
    map?.flyTo({ center: [peak.lng, peak.lat], zoom: 13, duration: 900 });
    onChangeRef.current(spot);
    setQuery(peak.name);
    setOpen(false);
    setActive(-1);
    searchRef.current?.blur();
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-2 right-2 top-2 z-10 flex max-w-md flex-col gap-1">
        <div className="flex gap-1">
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
            Topo
          </button>
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor={`${listId}-peak`}>
            Find a peak
          </label>
          <input
            ref={searchRef}
            id={`${listId}-peak`}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && matches.length > 0}
            aria-controls={`${listId}-results`}
            aria-activedescendant={active >= 0 && matches[active] ? `${listId}-opt-${active}` : undefined}
            placeholder="Find a peak"
            value={query}
            onFocus={() => {
              ensureCatalog();
              setOpen(true);
            }}
            onChange={(event) => {
              ensureCatalog();
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (!open || matches.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => (index + 1) % matches.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => (index <= 0 ? matches.length - 1 : index - 1));
              } else if (event.key === 'Enter' && active >= 0) {
                event.preventDefault();
                const picked = matches[active];
                if (picked) goToPeak(picked);
              } else if (event.key === 'Escape') {
                setOpen(false);
                setActive(-1);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
            }}
            className="w-full retro-box-inset min-h-11 bg-[#e7e1d4]/95 px-2 py-2 text-sm"
          />
          {catalogState === 'loading' ? (
            <p className="mt-0.5 px-1 text-[11px] text-[#1a1a1a]">Loading peak names</p>
          ) : null}
          {catalogState === 'error' ? (
            <p className="mt-0.5 px-1 text-[11px] text-red-900">Peak list did not load. Try again.</p>
          ) : null}
          {open && matches.length > 0 ? (
            <ul
              id={`${listId}-results`}
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-48 overflow-y-auto border-2 border-[#5c3a1e] bg-[#e7e1d4] shadow-[2px_2px_0_#5c3a1e]"
            >
              {matches.map((peak, index) => (
                <li key={`${peak.name}@${peak.lat},${peak.lng}`} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={active === index}
                    className={`flex w-full min-h-11 items-baseline justify-between gap-2 px-2 py-2 text-left text-sm ${active === index ? 'bg-[#ffc94d]' : 'hover:bg-[#f5ead6]'}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToPeak(peak)}
                  >
                    <span className="min-w-0 truncate font-bold">{peak.name}</span>
                    {peak.elevationM != null ? (
                      <span className="shrink-0 text-[11px]">{formatFeet(peak.elevationM)} ft</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
