'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  LngLatBounds,
  Map as MlMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MAP_CENTER,
  OPENFREEMAP_STYLE_URL,
  TERRAIN_ATTRIBUTION,
  type BasemapId,
} from '@/lib/map';
import { styleForBasemap } from '@/lib/map-style';
import { canUseWebGl2 } from '@/lib/map-webgl';
import { nearestTrack, type TrackCandidate } from '@/lib/nearest-line';
import {
  findItem,
  itemKey,
  pileAt,
  panLimit,
  pileTolerancePx,
  thumbSrc,
  type ExploreData,
  type ItemKind,
  type MapItem,
  type ScreenItem,
  type Selection,
} from '@/lib/map-explore';
import type { MapFeatureCollection } from '@/lib/posts';
import { PhotoPopupCard } from './ExplorePanel';

// Turbopack rewrites import.meta.url, so MapLibre looks for its worker next to
// the page chunk and gets HTML back. Serve the real worker as a static file.
setWorkerUrl('/maplibre-gl-worker.mjs');

export type PileMember = { kind: ItemKind; id: string };

type Props = {
  data: ExploreData;
  /** Items the pills let onto the map. */
  items: MapItem[];
  /** Route lines (and hidden-end fog points) for the routes in `items`. */
  lines: MapFeatureCollection;
  selection: Selection | null;
  /** A marker to lift without selecting it (the card being looked at in the pile strip). */
  highlight: PileMember | null;
  onSelect: (selection: Selection | null) => void;
  onPile: (members: PileMember[]) => void;
  pile: PileMember[] | null;
  basemap: BasemapId;
  threeD: boolean;
  /** The person tilted the map by hand while 3D was off. */
  onThreeDGesture: () => void;
  /** The person dragged the map (not a move the app made). */
  onUserPan: () => void;
  onMapError: () => void;
  /** How much of the bottom of the map the phone sheet covers, so the selection stays clear of it. */
  bottomInset: number;
  /** A spot along the open route (from dragging along its elevation profile). */
  scrub: { lng: number; lat: number; color: string } | null;
};

const ROUTES = 'explore-routes';
const DEM = 'explore-dem';
const TILT_PITCH = 62;
const GESTURE_TILT_DEGREES = 6;

const SKY = {
  'sky-color': '#8fb8e8',
  'horizon-color': '#dbe9f6',
  'fog-color': '#e8eef4',
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.7,
  'fog-ground-blend': 0.2,
} as const;

const styleCache = new Map<BasemapId, Promise<StyleSpecification | string>>();

/** The basemap style. Standard is OpenFreeMap as is; the others swap in USGS rasters (fetched once). */
function basemapStyle(basemap: BasemapId): Promise<StyleSpecification | string> {
  if (basemap === 'standard') return Promise.resolve(OPENFREEMAP_STYLE_URL);
  const cached = styleCache.get(basemap);
  if (cached) return cached;
  const next = fetch(OPENFREEMAP_STYLE_URL)
    .then((response) => response.json() as Promise<StyleSpecification>)
    .then((raw) => styleForBasemap(raw as never, basemap) as unknown as StyleSpecification)
    .catch(() => {
      styleCache.delete(basemap);
      return OPENFREEMAP_STYLE_URL;
    });
  styleCache.set(basemap, next);
  return next;
}

/** How far (pixels) from a tap a line still counts as tapped: a finger is blunter than a mouse. */
function clickReach(): number {
  return window.matchMedia('(pointer: coarse)').matches ? 24 : 12;
}

function addOverlay(map: MlMap, lines: MapFeatureCollection, threeD: boolean) {
  if (!map.getSource(ROUTES)) {
    map.addSource(ROUTES, { type: 'geojson', data: lines, promoteId: 'trackId' });
  }
  const isLine = ['==', ['geometry-type'], 'LineString'] as const;
  // Dashed for routes on foot, solid for wheels and snow.
  map.addLayer({
    id: 'explore-route-casing',
    type: 'line',
    source: ROUTES,
    filter: isLine as never,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-opacity': 0.9,
      'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 9, 6],
    },
  });
  map.addLayer({
    id: 'explore-route-hit',
    type: 'line',
    source: ROUTES,
    filter: isLine as never,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#000000', 'line-opacity': 0, 'line-width': 20 },
  });
  map.addLayer({
    id: 'explore-route-line',
    type: 'line',
    source: ROUTES,
    filter: isLine as never,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 5, 3],
    },
  });
  // A route with hidden ends gets a soft fog over each cut, sized in meters.
  map.addLayer({
    id: 'explore-route-hidden-ends',
    type: 'circle',
    source: ROUTES,
    filter: ['==', ['get', 'kind'], 'hidden-end'],
    paint: {
      'circle-color': '#f4f1ea',
      'circle-opacity': 0.95,
      'circle-blur': 0.9,
      'circle-radius': [
        'interpolate', ['exponential', 2], ['zoom'],
        0, ['get', 'zoneRadius'],
        24, ['*', ['get', 'zoneRadius'], 16777216],
      ],
    },
  });
  applyTerrain(map, threeD, false);
}

function applyTerrain(map: MlMap, on: boolean, ease: boolean) {
  if (on) {
    if (!map.getSource(DEM)) {
      map.addSource(DEM, {
        type: 'raster-dem',
        tiles: [`${window.location.origin}/api/terrain/{z}/{x}/{y}`],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
        attribution: TERRAIN_ATTRIBUTION,
      });
    }
    map.setTerrain({ source: DEM, exaggeration: 1.4 });
    map.setSky(SKY);
    if (ease) map.easeTo({ pitch: TILT_PITCH, duration: 900 });
    return;
  }
  if (!ease) {
    map.setTerrain(null);
    return;
  }
  map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
  map.once('moveend', () => map.setTerrain(null));
}

/** Every route line near a tap, as screen-pixel lines (topmost first). */
function routeCandidates(map: MlMap, data: ExploreData, point: { x: number; y: number }, reach: number): TrackCandidate[] {
  if (!map.getLayer('explore-route-hit')) return [];
  const features = map.queryRenderedFeatures(
    [[point.x - reach, point.y - reach], [point.x + reach, point.y + reach]],
    { layers: ['explore-route-hit'] },
  );
  const seen = new Set<string>();
  const out: TrackCandidate[] = [];
  features.forEach((feature, index) => {
    const id = feature.properties?.trackId;
    if (typeof id !== 'string' || seen.has(id)) return;
    seen.add(id);
    const coords = data.lines.get(id);
    if (!coords) return;
    out.push({ kind: 'route', id, order: index, line: coords.map((coord) => map.project(coord)) });
  });
  return out;
}

/** Visible markers (and route starts) as screen points, for working out piles. */
function screenItems(map: MlMap, items: MapItem[]): ScreenItem[] {
  return items.map((item) => {
    const projected = map.project([item.lng, item.lat]);
    return { kind: item.kind, id: item.id, x: projected.x, y: projected.y };
  });
}

export function fitPile(map: MlMap, data: ExploreData, members: PileMember[], bottomInset: number) {
  const bounds = new LngLatBounds();
  for (const member of members) {
    const item = findItem(data, member);
    if (item) bounds.extend([item.lng, item.lat]);
  }
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, {
    padding: { top: 96, bottom: Math.max(bottomInset + 200, 220), left: 48, right: 48 },
    maxZoom: 15,
    duration: 650,
  });
}

function focusSelection(map: MlMap, data: ExploreData, selection: Selection, duration: number, bottomInset: number) {
  if (!selection.fly) return;
  const item = findItem(data, selection);
  if (selection.kind === 'route') {
    const coords = data.lines.get(selection.id);
    if (coords && coords.length > 1) {
      const bounds = coords.reduce((box, coord) => box.extend(coord), new LngLatBounds(coords[0], coords[0]));
      const height = map.getContainer().clientHeight;
      map.fitBounds(bounds, {
        padding: { top: Math.min(120, Math.round(height * 0.1)), bottom: Math.max(bottomInset + 24, 56), left: 48, right: 48 },
        maxZoom: 15,
        duration,
      });
      return;
    }
  }
  if (!item) return;
  const zoom = Math.max(map.getZoom(), 13);
  if (selection.kind === 'photo' && bottomInset <= 0) {
    // Leave room above the photo for its popup card.
    const drop = Math.min(170, Math.round(map.getContainer().clientHeight * 0.24));
    map.easeTo({ center: [item.lng, item.lat], offset: [0, drop], zoom, duration });
    return;
  }
  map.easeTo({
    center: [item.lng, item.lat],
    zoom,
    padding: { top: 48, bottom: Math.max(bottomInset + 24, 56), left: 32, right: 32 },
    duration,
  });
}

type MarkerCtx = {
  data: ExploreData;
  items: MapItem[];
  activeKey: string | null;
  openKey: string | null;
  onTap: (item: MapItem) => void;
};

function markerElement(item: MapItem, index: number, ctx: MarkerCtx): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.key = itemKey(item);
  el.dataset.active = ctx.activeKey === itemKey(item) ? 'true' : 'false';
  el.dataset.open = ctx.openKey === itemKey(item) ? 'true' : 'false';
  el.setAttribute('aria-label', item.title);
  el.style.zIndex = String(index);
  el.style.setProperty('--pin-color', item.color);
  const thumb = thumbSrc(item, 96);
  const face = document.createElement('span');
  face.className = 'explore-marker-face';
  if (thumb) {
    el.className = `explore-marker explore-marker-photo${item.kind === 'pin' ? ' explore-marker-pin-photo' : ''}`;
    face.style.backgroundImage = `url("${thumb}")`;
  } else {
    el.className = 'explore-marker explore-marker-pin';
  }
  el.append(face);
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    ctx.onTap(item);
  });
  return el;
}

/** Draws a marker for every photo and pin in (or near) the view, and drops the rest. */
function renderMarkers(map: MlMap, ctx: MarkerCtx, markers: Map<string, Marker>, force: boolean) {
  if (force) {
    markers.forEach((marker) => marker.remove());
    markers.clear();
  }
  const view = map.getBounds();
  const padLng = (view.getEast() - view.getWest()) * 0.25;
  const padLat = (view.getNorth() - view.getSouth()) * 0.25;
  const wanted = new Set<string>();
  ctx.items.forEach((item, index) => {
    if (item.kind === 'route') return;
    if (item.lng < view.getWest() - padLng || item.lng > view.getEast() + padLng) return;
    if (item.lat < view.getSouth() - padLat || item.lat > view.getNorth() + padLat) return;
    const key = itemKey(item);
    wanted.add(key);
    if (markers.has(key)) return;
    markers.set(
      key,
      new Marker({ element: markerElement(item, index, ctx), anchor: 'center' }).setLngLat([item.lng, item.lat]).addTo(map),
    );
  });
  markers.forEach((marker, key) => {
    if (wanted.has(key)) return;
    marker.remove();
    markers.delete(key);
  });
}

function fitAll(map: MlMap, data: ExploreData, items: MapItem[]) {
  const bounds = new LngLatBounds();
  for (const item of items) {
    bounds.extend([item.lng, item.lat]);
    if (item.kind === 'route') for (const coord of data.lines.get(item.id) ?? []) bounds.extend(coord);
  }
  if (bounds.isEmpty()) {
    map.jumpTo({ center: [MAP_CENTER.lng, MAP_CENTER.lat], zoom: 7 });
    return;
  }
  map.fitBounds(bounds, { padding: 64, maxZoom: 12, duration: 0 });
}

export function ExploreCanvas(props: Props) {
  const { items, lines, selection, highlight, pile, basemap, threeD, bottomInset, scrub } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef(new Map<string, Marker>());
  const scrubMarkerRef = useRef<Marker | null>(null);
  const gestureRef = useRef(false);
  const selectedRouteRef = useRef<string | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const markerCtx = (): MarkerCtx => {
    const p = latest.current;
    const activeKey = p.selection && p.selection.kind !== 'route'
      ? itemKey(p.selection)
      : p.highlight ? itemKey(p.highlight) : null;
    return {
      data: p.data,
      items: p.items,
      activeKey,
      openKey: p.selection?.kind === 'photo' ? itemKey(p.selection) : null,
      onTap: (item) => {
        const map = mapRef.current;
        const now = latest.current;
        if (!map) return;
        const origin = map.project([item.lng, item.lat]);
        const members = pileAt(origin, item, screenItems(map, now.items), pileTolerancePx(map.getZoom()));
        if (members.length > 1) {
          now.onPile(members);
          fitPile(map, now.data, members, now.bottomInset);
          return;
        }
        now.onSelect({ kind: item.kind, id: item.id });
      },
    };
  };

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    if (!canUseWebGl2()) {
      latest.current.onMapError();
      return;
    }
    let map: MlMap;
    try {
      map = new MlMap({
        container,
        // A non-standard basemap is swapped in right away (see the basemap effect), so start blank.
        style: latest.current.basemap === 'standard' ? OPENFREEMAP_STYLE_URL : { version: 8, sources: {}, layers: [] },
        center: [MAP_CENTER.lng, MAP_CENTER.lat],
        zoom: 7,
        maxPitch: 80,
        attributionControl: { compact: true },
      });
    } catch {
      latest.current.onMapError();
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('error', (event) => {
      const msg = event.error?.message ?? String(event.error ?? '');
      if (/webgl|gpu|context/i.test(msg)) latest.current.onMapError();
    });

    let firstLoad = true;
    map.on('style.load', () => {
      const p = latest.current;
      addOverlay(map, p.lines, p.threeD);
      selectedRouteRef.current = null;
      syncSelectedRoute(map, p.selection);
      readyRef.current = true;
      if (!firstLoad) return;
      firstLoad = false;
      renderMarkers(map, markerCtx(), markersRef.current, true);
      if (p.selection && findItem(p.data, p.selection)) {
        focusSelection(map, p.data, { ...p.selection, fly: true }, 0, p.bottomInset);
      } else {
        fitAll(map, p.data, p.items);
      }
      // Room to look around, but not to drift off into empty ocean.
      const limit = panLimit(p.data.items.map((item) => [item.lng, item.lat] as [number, number]));
      if (limit) map.setMaxBounds(limit);
      if (p.threeD) applyTerrain(map, true, true);
      const attrib = container.querySelector('.maplibregl-ctrl-attrib');
      attrib?.classList.remove('maplibregl-compact-show');
      attrib?.removeAttribute('open');
    });

    map.on('click', (event) => {
      const p = latest.current;
      const reach = clickReach();
      const hit = nearestTrack(event.point, routeCandidates(map, p.data, event.point, reach), reach);
      if (!hit) {
        p.onSelect(null);
        return;
      }
      const members = pileAt(
        event.point,
        { kind: 'route', id: hit.id },
        screenItems(map, p.items),
        pileTolerancePx(map.getZoom()),
      );
      if (members.length > 1) {
        p.onPile(members);
        fitPile(map, p.data, members, p.bottomInset);
        return;
      }
      p.onSelect({ kind: 'route', id: hit.id });
    });
    map.on('mousemove', (event) => {
      if (!map.getLayer('explore-route-hit')) return;
      const hovering = map.queryRenderedFeatures(event.point, { layers: ['explore-route-hit'] }).length > 0;
      map.getCanvas().style.cursor = hovering ? 'pointer' : '';
    });
    map.on('moveend', () => renderMarkers(map, markerCtx(), markersRef.current, false));
    map.on('dragstart', (event) => {
      if (event.originalEvent) latest.current.onUserPan();
    });
    // Tilting by hand (right-click or Ctrl drag, two-finger tilt) is asking for 3D.
    map.on('pitch', (event) => {
      if (!event.originalEvent || latest.current.threeD || gestureRef.current) return;
      if (map.getPitch() < GESTURE_TILT_DEGREES) return;
      gestureRef.current = true;
      latest.current.onThreeDGesture();
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);

    const markers = markersRef.current;
    return () => {
      resize.disconnect();
      markers.forEach((marker) => marker.remove());
      markers.clear();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
     
  }, []);

  // Basemap.
  const firstBasemap = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (firstBasemap.current && basemap === 'standard') {
      firstBasemap.current = false;
      return;
    }
    firstBasemap.current = false;
    let cancelled = false;
    void basemapStyle(basemap).then((style) => {
      if (cancelled || !mapRef.current) return;
      readyRef.current = false;
      map.setStyle(style);
    });
    return () => {
      cancelled = true;
    };
  }, [basemap]);

  // 3D.
  const firstThreeD = useRef(true);
  useEffect(() => {
    if (firstThreeD.current) {
      firstThreeD.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const ease = !gestureRef.current;
    gestureRef.current = false;
    if (threeD) applyTerrain(map, true, ease);
    else applyTerrain(map, false, true);
  }, [threeD]);

  // Lines and markers follow the pills.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(ROUTES) as GeoJSONSource | undefined)?.setData(lines);
    selectedRouteRef.current = null;
    syncSelectedRoute(map, latest.current.selection);
    renderMarkers(map, markerCtx(), markersRef.current, true);
     
  }, [lines, items]);

  // Selected route draws thicker; the selected or highlighted marker lifts.
  function syncSelectedRoute(map: MlMap, next: Selection | null) {
    if (!map.getSource(ROUTES)) return;
    const id = next?.kind === 'route' ? next.id : null;
    if (selectedRouteRef.current === id) return;
    if (selectedRouteRef.current) map.setFeatureState({ source: ROUTES, id: selectedRouteRef.current }, { selected: false });
    if (id) map.setFeatureState({ source: ROUTES, id }, { selected: true });
    selectedRouteRef.current = id;
  }

  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) syncSelectedRoute(map, selection);
    const ctx = markerCtx();
    markersRef.current.forEach((marker, key) => {
      const el = marker.getElement();
      el.dataset.active = key === ctx.activeKey ? 'true' : 'false';
      el.dataset.open = key === ctx.openKey ? 'true' : 'false';
    });
     
  }, [selection, highlight, items]);

  // Bring a selection into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !selection) return;
    focusSelection(map, latest.current.data, selection, 500, bottomInset);
  }, [selection, bottomInset]);

  // Re-fit when a pile opens.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !pile || pile.length < 2) return;
    fitPile(map, latest.current.data, pile, bottomInset);
  }, [pile, bottomInset]);

  // The dot that follows a finger along the elevation profile.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!scrub) {
      scrubMarkerRef.current?.remove();
      scrubMarkerRef.current = null;
      return;
    }
    if (!scrubMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'explore-scrub-dot';
      scrubMarkerRef.current = new Marker({ element: el, anchor: 'center' }).setLngLat([scrub.lng, scrub.lat]).addTo(map);
    }
    scrubMarkerRef.current.getElement().style.setProperty('--scrub-color', scrub.color);
    scrubMarkerRef.current.setLngLat([scrub.lng, scrub.lat]);
  }, [scrub]);

  // A selected photo opens as a card pinned to its spot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selection?.kind !== 'photo') return;
    const item = findItem(latest.current.data, selection);
    if (!item) return;
    const node = document.createElement('div');
    const drop = Math.min(170, Math.round(map.getContainer().clientHeight * 0.24));
    node.style.setProperty('--card-max', `${Math.max(220, Math.round(map.getContainer().clientHeight / 2 + drop - 56))}px`);
    const root: Root = createRoot(node);
    root.render(<PhotoPopupCard item={item} onClose={() => latest.current.onSelect(null)} />);
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 0,
      maxWidth: 'none',
      className: 'explore-popup',
      anchor: 'bottom',
      focusAfterOpen: false,
    })
      .setLngLat([item.lng, item.lat])
      .setDOMContent(node)
      .addTo(map);

    // Keep the card inside the map sideways.
    const content = popup.getElement().querySelector<HTMLElement>('.maplibregl-popup-content');
    const keepOnScreen = () => {
      if (!content) return;
      content.style.translate = '0px 0px';
      const card = content.getBoundingClientRect();
      const view = map.getContainer().getBoundingClientRect();
      let dx = 0;
      if (card.left < view.left + 12) dx = view.left + 12 - card.left;
      else if (card.right > view.right - 12) dx = view.right - 12 - card.right;
      content.style.translate = `${Math.round(dx)}px 0px`;
    };
    // Scrolling over the card zooms the map, unless the card itself has more to scroll.
    const popupEl = popup.getElement();
    const passWheelToMap = (event: WheelEvent) => {
      const cardEl = popupEl.querySelector('article');
      if (cardEl && cardEl.scrollHeight > cardEl.clientHeight + 1) {
        const atTop = cardEl.scrollTop <= 0;
        const atBottom = cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 1;
        if (event.deltaY < 0 ? !atTop : !atBottom) return;
      }
      event.preventDefault();
      map.getCanvasContainer().dispatchEvent(new WheelEvent('wheel', event));
    };
    popupEl.addEventListener('wheel', passWheelToMap, { passive: false });
    map.on('move', keepOnScreen);
    const watcher = new ResizeObserver(keepOnScreen);
    watcher.observe(node);
    requestAnimationFrame(keepOnScreen);
    return () => {
      map.off('move', keepOnScreen);
      popupEl.removeEventListener('wheel', passWheelToMap);
      watcher.disconnect();
      popup.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [selection]);

  return <div ref={containerRef} className="explore-map isolate h-full w-full" />;
}
