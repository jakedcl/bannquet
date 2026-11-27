/**
 * The /map explorer's data model, as plain functions (no DOM, no MapLibre), so it can be tested.
 *
 * The server sends GeoJSON (points for every route marker, photo and pin; lines for route geometry). The explorer
 * turns that into one typed list of items, filters it with the pills, searches it with the box, and works out which
 * items sit on top of each other on screen (a "pile").
 */
import { ACTIVITY_META, MAP_GROUPS, isActivity, mapGroupForActivity, type MapGroup } from '@/lib/activities';
import { NEUTRAL_PIN_COLOR } from '@/lib/map';
import type { MapFeatureCollection } from '@/lib/posts';
import { formatTripDate } from '@/lib/utils';

export type ItemKind = 'route' | 'photo' | 'pin';

export type MapItem = {
  kind: ItemKind;
  /** The database id (a route's track id, a photo's or pin's id). */
  id: string;
  title: string;
  who: string;
  date: string | null;
  activity: string | null;
  /** Pin kind label ("Campsite"), empty for routes and photos. */
  category: string;
  color: string;
  href: string;
  lng: number;
  lat: number;
  /** Full photo (photos, and a pin's first photo). */
  image: string | null;
  /** Small Blob thumbnail, when the upload made one. */
  thumb: string | null;
  width: number | null;
  height: number | null;
  distanceM: number | null;
  elevGainM: number | null;
  linkedTrackId: string | null;
  linkedRouteTitle: string | null;
};

/** What is selected, and whether the map should fly to it (a list pick or a link does; a tap on the map doesn't). */
export type Selection = { kind: ItemKind; id: string; fly?: boolean };

export type ExploreData = {
  items: MapItem[];
  /** Route geometry by track id, as the viewer is allowed to see it. */
  lines: Map<string, [number, number][]>;
};

const KIND_FROM_PROPS: Record<string, ItemKind> = { route: 'route', photo: 'photo', pin: 'pin' };

function str(value: unknown): string | null {
  if (value == null) return null;
  const next = String(value);
  return next.length > 0 ? next : null;
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The id at the end of an item's page link (`/photos/<id>` → `<id>`). */
function idFromHref(href: string): string {
  return href.split('/').filter(Boolean).pop() ?? href;
}

export function exploreData(points: MapFeatureCollection, lines: MapFeatureCollection): ExploreData {
  const items: MapItem[] = [];
  const seen = new Set<string>();
  for (const feature of points.features) {
    if (feature.geometry.type !== 'Point') continue;
    const props = feature.properties;
    const kind = KIND_FROM_PROPS[String(props.kind ?? '')];
    if (!kind) continue;
    const href = str(props.href) ?? '';
    const id = kind === 'route' ? (str(props.trackId) ?? idFromHref(href)) : idFromHref(href);
    const key = `${kind}:${id}`;
    if (!id || seen.has(key)) continue;
    seen.add(key);
    const [lng, lat] = feature.geometry.coordinates;
    items.push({
      kind,
      id,
      title: str(props.title) ?? (kind === 'route' ? 'Route' : kind === 'pin' ? 'Pin' : 'Photo'),
      who: str(props.who) ?? 'Friend',
      date: str(props.date),
      activity: str(props.activity),
      category: str(props.category) ?? '',
      color: str(props.color) ?? NEUTRAL_PIN_COLOR,
      href,
      lng,
      lat,
      image: str(props.image),
      thumb: str(props.thumb),
      width: num(props.width),
      height: num(props.height),
      distanceM: num(props.distanceM),
      elevGainM: num(props.elevGainM),
      linkedTrackId: str(props.linkedTrackId),
      linkedRouteTitle: str(props.linkedRouteTitle),
    });
  }
  const routeLines = new Map<string, [number, number][]>();
  for (const feature of lines.features) {
    if (feature.geometry.type !== 'LineString') continue;
    const trackId = str(feature.properties.trackId);
    if (!trackId) continue;
    routeLines.set(trackId, feature.geometry.coordinates);
  }
  return { items, lines: routeLines };
}

export function itemKey(item: { kind: ItemKind; id: string }): string {
  return `${item.kind}-${item.id}`;
}

export function findItem(data: ExploreData, selection: { kind: ItemKind; id: string } | null): MapItem | null {
  if (!selection) return null;
  return data.items.find((item) => item.kind === selection.kind && item.id === selection.id) ?? null;
}

/* ---- Filters ------------------------------------------------------------ */

/**
 * The pills. No main pill on means everything shows. Turning on Routes, Photos or Pins shows only those; the
 * sub-pills under Routes (activity groups) and Pins (pin kinds) narrow that group further.
 * The search text never changes the map, only the results list.
 */
export type ExploreFilters = {
  kinds: ItemKind[];
  groups: MapGroup[];
  pinKinds: string[];
  query: string;
};

export const emptyFilters: ExploreFilters = { kinds: [], groups: [], pinKinds: [], query: '' };

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Turning a main pill off also clears its sub-pills, so nothing hidden keeps filtering. */
export function toggleKindFilter(state: ExploreFilters, kind: ItemKind): ExploreFilters {
  const kinds = toggle(state.kinds, kind);
  const off = !kinds.includes(kind);
  return {
    ...state,
    kinds,
    groups: off && kind === 'route' ? [] : state.groups,
    pinKinds: off && kind === 'pin' ? [] : state.pinKinds,
  };
}

export function toggleGroupFilter(state: ExploreFilters, group: MapGroup): ExploreFilters {
  return { ...state, groups: toggle(state.groups, group) };
}

export function togglePinKindFilter(state: ExploreFilters, pinKind: string): ExploreFilters {
  return { ...state, pinKinds: toggle(state.pinKinds, pinKind) };
}

export function activeFilterCount(state: ExploreFilters): number {
  return state.kinds.length + state.groups.length + state.pinKinds.length;
}

/** Same pills (ignoring the search text). */
export function samePills(a: ExploreFilters, b: ExploreFilters): boolean {
  const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v) => y.includes(v));
  return same(a.kinds, b.kinds) && same(a.groups, b.groups) && same(a.pinKinds, b.pinKinds);
}

function activityGroup(activity: string | null): MapGroup | null {
  return activity && isActivity(activity) ? mapGroupForActivity(activity) : null;
}

/** Whether the pills let this item onto the map. */
export function passesPills(item: MapItem, state: ExploreFilters): boolean {
  if (state.kinds.length > 0 && !state.kinds.includes(item.kind)) return false;
  if (item.kind === 'route' && state.groups.length > 0) {
    const group = activityGroup(item.activity);
    if (!group || !state.groups.includes(group)) return false;
  }
  if (item.kind === 'pin' && state.pinKinds.length > 0 && !state.pinKinds.includes(item.category)) return false;
  return true;
}

/** Whether the search text matches (title, who, activity, pin kind). Empty text matches everything. */
export function matchesQuery(item: MapItem, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [item.title, item.who, item.category, kindLabel(item), item.date ?? '']
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export function visibleItems(data: ExploreData, state: ExploreFilters): MapItem[] {
  return data.items.filter((item) => passesPills(item, state));
}

/** The results list: what's on the map and matches the search, newest first (undated last). */
export function resultList(data: ExploreData, state: ExploreFilters): MapItem[] {
  return data.items
    .filter((item) => passesPills(item, state) && matchesQuery(item, state.query))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title));
}

export type FilterOptions = {
  kinds: ItemKind[];
  groups: { group: MapGroup; label: string }[];
  pinKinds: string[];
};

/** Only offer pills for things that are actually on the map. */
export function filterOptions(data: ExploreData): FilterOptions {
  const kinds = (['route', 'photo', 'pin'] as const).filter((kind) => data.items.some((item) => item.kind === kind));
  const groupSet = new Set<MapGroup>();
  const pinKinds = new Set<string>();
  for (const item of data.items) {
    if (item.kind === 'route') {
      const group = activityGroup(item.activity);
      if (group) groupSet.add(group);
    }
    if (item.kind === 'pin' && item.category) pinKinds.add(item.category);
  }
  const groups = (Object.keys(MAP_GROUPS) as MapGroup[])
    .filter((group) => groupSet.has(group))
    .map((group) => ({ group, label: MAP_GROUPS[group].label }));
  return { kinds, groups: groups.length > 1 ? groups : [], pinKinds: pinKinds.size > 1 ? [...pinKinds].sort() : [] };
}

export const KIND_PILL_LABEL: Record<ItemKind, string> = { route: 'Routes', photo: 'Photos', pin: 'Pins' };

/* ---- Text --------------------------------------------------------------- */

export function kindLabel(item: MapItem): string {
  if (item.kind === 'photo') return 'Photo';
  if (item.kind === 'pin') return item.category || 'Pin';
  if (item.activity && isActivity(item.activity)) return ACTIVITY_META[item.activity].label;
  return 'Route';
}

export function formatMiles(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

export function formatFeet(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  return `${Math.round(meters * 3.28084).toLocaleString('en-US')} ft`;
}

/** "Hike · Jake · Oct 3, 2026 · 4.2 mi" */
export function itemMeta(item: MapItem): string {
  return [kindLabel(item), item.who, item.date ? formatTripDate(item.date) : null, formatMiles(item.distanceM)]
    .filter(Boolean)
    .join(' · ');
}

/** The small picture for a marker or a list row. Legacy photos without a Blob thumb go through image resizing. */
export function thumbSrc(item: Pick<MapItem, 'thumb' | 'image'>, width = 96): string | null {
  if (item.thumb) return item.thumb;
  if (!item.image) return null;
  return `/_next/image?url=${encodeURIComponent(item.image)}&w=${width}&q=70`;
}

/** The link that reopens this item on the map. */
export function shareParam(kind: ItemKind): 'track' | 'photo' | 'pin' {
  return kind === 'route' ? 'track' : kind;
}

export function selectionFromParams(params: { track?: string; photo?: string; pin?: string }): Selection | null {
  if (params.track) return { kind: 'route', id: params.track, fly: true };
  if (params.photo) return { kind: 'photo', id: params.photo, fly: true };
  if (params.pin) return { kind: 'pin', id: params.pin, fly: true };
  return null;
}

/* ---- Piles -------------------------------------------------------------- */

/** Zoom level from which only practically stacked markers count as a pile. */
export const PILE_MAX_ZOOM = 14;

/** How close (screen pixels) two markers must be for a tap to treat them as one pile. */
export function pileTolerancePx(zoom: number): number {
  return zoom >= PILE_MAX_ZOOM ? 8 : 20;
}

export type ScreenItem = { kind: ItemKind; id: string; x: number; y: number };

/**
 * Everything drawn within the pile tolerance of a tapped spot, the tapped item first. Routes count by their marker
 * point (the start, or where a private route's shown part starts).
 */
export function pileAt(
  origin: { x: number; y: number },
  primary: { kind: ItemKind; id: string },
  candidates: ScreenItem[],
  tolerance: number,
): { kind: ItemKind; id: string }[] {
  const out = [{ kind: primary.kind, id: primary.id }];
  const seen = new Set([itemKey(primary)]);
  for (const candidate of candidates) {
    const key = itemKey(candidate);
    if (seen.has(key)) continue;
    if (Math.abs(candidate.x - origin.x) < tolerance && Math.abs(candidate.y - origin.y) < tolerance) {
      seen.add(key);
      out.push({ kind: candidate.kind, id: candidate.id });
    }
  }
  return out;
}

/* ---- Photos along a route ----------------------------------------------- */

/** Metres from a point to a line, on a flat local projection (good to a few metres at trail scale). */
export function metersToLine(lng: number, lat: number, line: [number, number][]): number {
  if (line.length === 0) return Infinity;
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110_574;
  const project = ([x, y]: [number, number]) => ({ x: (x - lng) * kx, y: (y - lat) * ky });
  let best = Infinity;
  let a = project(line[0]!);
  if (line.length === 1) return Math.hypot(a.x, a.y);
  for (let i = 1; i < line.length; i += 1) {
    const b = project(line[i]!);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-a.x * dx - a.y * dy) / len2));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
    a = b;
  }
  return best;
}

export function linkedPhotosForRoute(data: ExploreData, routeId: string): MapItem[] {
  return data.items.filter(
    (item) => item.kind === 'photo' && item.linkedTrackId === routeId && thumbSrc(item),
  );
}

/** Photos near the line but not already saved on this route. */
export function nearbyPhotosForRoute(data: ExploreData, routeId: string, meters = 250): MapItem[] {
  const linked = new Set(linkedPhotosForRoute(data, routeId).map((item) => item.id));
  return photosAlongRoute(data, routeId, meters).filter((item) => !linked.has(item.id));
}

/** Photos (and pins with a photo) taken within `meters` of a route, ordered along it from the start. */
export function photosAlongRoute(data: ExploreData, routeId: string, meters = 250): MapItem[] {
  const line = data.lines.get(routeId);
  if (!line || line.length < 2) return [];
  const near: { item: MapItem; at: number }[] = [];
  for (const item of data.items) {
    if (item.kind === 'route' || !thumbSrc(item)) continue;
    if (metersToLine(item.lng, item.lat, line) > meters) continue;
    // Position along the route: index of the closest vertex.
    let at = 0;
    let bestD = Infinity;
    line.forEach(([x, y], index) => {
      const d = (x - item.lng) ** 2 + (y - item.lat) ** 2;
      if (d < bestD) {
        bestD = d;
        at = index;
      }
    });
    near.push({ item, at });
  }
  return near.sort((a, b) => a.at - b.at).map((entry) => entry.item);
}

/**
 * The area the map may be panned to: everything on it plus a generous margin, so you can look around and zoom
 * out a little but can't drift off into empty ocean. Null with nothing on the map.
 */
export function panLimit(points: [number, number][]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  const lngMargin = Math.max((east - west) * 0.75, 6);
  const latMargin = Math.max((north - south) * 0.75, 4);
  return [
    [Math.max(-180, west - lngMargin), Math.max(-85, south - latMargin)],
    [Math.min(180, east + lngMargin), Math.min(85, north + latMargin)],
  ];
}
