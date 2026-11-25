'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayersIcon } from '@/components/hub/Icons';
import { BASEMAPS, BASEMAP_LABELS, isBasemap, type BasemapId } from '@/lib/map';
import {
  emptyFilters,
  exploreData,
  filterOptions,
  findItem,
  itemKey,
  photosAlongRoute,
  resultList,
  samePills,
  visibleItems,
  type ExploreFilters,
  type ItemKind,
  type MapItem,
  type Selection,
} from '@/lib/map-explore';
import type { MapFeatureCollection } from '@/lib/posts';
import type { RouteScrubPoint } from '@/lib/route-elevation';
import type { SnapName } from '@/lib/sheet-snap';
import { useMediaQuery } from '@/lib/use-media-query';
import { DetailsPanel, FilterPills, PanelHeading, ResultsList, SearchBar } from './ExplorePanel';
import { MapSheet } from './MapSheet';
import { PileStrip } from './PileStrip';

const ExploreCanvas = dynamic(() => import('./ExploreCanvas').then((mod) => mod.ExploreCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-gray" />,
});

type Member = { kind: ItemKind; id: string };

const BASEMAP_KEY = 'bannquet:map-basemap';
const DEFAULT_BASEMAP: BasemapId = 'hybrid';

function savedBasemap(): BasemapId {
  try {
    const value = window.localStorage.getItem(BASEMAP_KEY);
    return value && isBasemap(value) ? value : DEFAULT_BASEMAP;
  } catch {
    return DEFAULT_BASEMAP;
  }
}

/**
 * The /map page: the crew's routes, photos and pins on a full-screen map, with a sidebar (desktop) or a bottom
 * sheet (phone) holding search, filter pills, the results list and the details of whatever is open.
 */
export function MapExplorer({ points, lines, initialSelection }: {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  initialSelection: Selection | null;
}) {
  const data = useMemo(() => exploreData(points, lines), [points, lines]);
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const [selection, setSelection] = useState<Selection | null>(
    initialSelection && findItem(data, initialSelection) ? initialSelection : null,
  );
  const [snap, setSnap] = useState<SnapName>(initialSelection ? 'half' : 'peek');
  // Pills and search text are kept apart so typing never redraws the map.
  const [pills, setPills] = useState<ExploreFilters>(emptyFilters);
  const [query, setQuery] = useState('');
  const filters = useMemo(() => ({ ...pills, query }), [pills, query]);
  const setFilters = useCallback((next: ExploreFilters) => {
    setQuery(next.query);
    setPills((current) => (samePills(current, next) ? current : { ...next, query: '' }));
  }, []);
  const deferredPills = useDeferredValue(pills);
  const items = useMemo(() => visibleItems(data, deferredPills), [data, deferredPills]);
  const routeIds = useMemo(() => new Set(items.filter((item) => item.kind === 'route').map((item) => item.id)), [items]);
  const shownLines = useMemo<MapFeatureCollection>(
    () => ({ type: 'FeatureCollection', features: lines.features.filter((f) => routeIds.has(String(f.properties.trackId ?? ''))) }),
    [lines, routeIds],
  );
  const options = useMemo(() => filterOptions(data), [data]);
  const results = useMemo(() => resultList(data, filters), [data, filters]);

  const [pile, setPile] = useState<Member[] | null>(null);
  const [pileIndex, setPileIndex] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);
  const [threeD, setThreeD] = useState(false);
  const [hint, setHint] = useState<'touch' | 'mouse' | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [scrub, setScrub] = useState<RouteScrubPoint | null>(null);
  const [basemap, setBasemapState] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [layersOpen, setLayersOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  // The saved basemap is read after the first paint (the server can't know it).
  useEffect(() => {
    const saved = savedBasemap();
    if (saved !== DEFAULT_BASEMAP) queueMicrotask(() => setBasemapState(saved));
  }, []);
  const setBasemap = (next: BasemapId) => {
    setBasemapState(next);
    try {
      window.localStorage.setItem(BASEMAP_KEY, next);
    } catch {
      /* private mode */
    }
  };

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const changeThreeD = (next: boolean) => {
    setThreeD(next);
    setLayersOpen(false);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (!next) {
      setHint(null);
      return;
    }
    setHint(window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse');
    hintTimer.current = setTimeout(() => setHint(null), 5000);
  };
  // Tilting by hand turns 3D on, with no how-to hint: they clearly know how.
  const onThreeDGesture = useCallback(() => setThreeD(true), []);

  // Any new selection (or a tap on empty map) closes the pile. On a phone, choosing something raises the sheet,
  // except a photo, whose card opens on the map itself.
  const select = useCallback((next: Selection | null) => {
    setPile(null);
    setScrub(null);
    setSelection(next);
    if (next) setSnap(next.kind === 'photo' ? 'peek' : 'half');
  }, []);

  const openPile = useCallback((members: Member[]) => {
    setSelection(null);
    setSnap('peek');
    setPileIndex(0);
    setPile(members);
  }, []);

  const lowerSheet = useCallback(() => setSnap('peek'), []);
  const raiseSheetForSearch = useCallback(() => setSnap((current) => (current === 'peek' ? 'half' : current)), []);
  const onScrub = useCallback((point: RouteScrubPoint | null) => setScrub(point), []);

  // Keep the address bar pointing at whatever is open, so the link can be shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of ['track', 'photo', 'pin', 'post']) url.searchParams.delete(key);
    if (selection) url.searchParams.set(selection.kind === 'route' ? 'track' : selection.kind, selection.id);
    window.history.replaceState(window.history.state, '', url);
  }, [selection]);

  // The layers menu closes on an outside tap or Escape.
  useEffect(() => {
    if (!layersOpen) return;
    const close = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) setLayersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLayersOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [layersOpen]);

  const pickResult = useCallback((item: MapItem) => select({ kind: item.kind, id: item.id, fly: true }), [select]);

  const visibleKeys = useMemo(() => new Set(items.map(itemKey)), [items]);
  const card = selection && visibleKeys.has(itemKey(selection)) ? selection : null;
  const cardItem = findItem(data, card);
  const total = data.items.length;

  const details = cardItem ? (
    <DetailsPanel
      key={itemKey(cardItem)}
      item={cardItem}
      coords={cardItem.kind === 'route' ? data.lines.get(cardItem.id) ?? null : null}
      along={cardItem.kind === 'route' ? photosAlongRoute(data, cardItem.id).filter((photo) => visibleKeys.has(itemKey(photo))) : []}
      onOpenItem={(photo) => select({ kind: photo.kind, id: photo.id, fly: true })}
      onBack={() => select(null)}
      onScrub={onScrub}
    />
  ) : null;

  const pileResults = useMemo(() => {
    if (!pile || pile.length < 2) return null;
    return pile.map((member) => findItem(data, member)).filter((item): item is MapItem => Boolean(item));
  }, [pile, data]);
  const current = pile?.[pileIndex] ?? null;

  const listBody = pileResults && pileResults.length > 1 ? (
    <>
      <PanelHeading
        action={(
          <button type="button" onClick={() => select(null)} className="text-caption font-bold text-ink-2 underline underline-offset-2">
            Show all
          </button>
        )}
      >
        Stacked here
      </PanelHeading>
      <ResultsList
        results={pileResults}
        total={pileResults.length}
        onPick={pickResult}
        countLabel={`${pileIndex + 1} of ${pileResults.length}`}
        activeKey={current ? itemKey(current) : undefined}
      />
    </>
  ) : (
    <>
      <FilterPills state={filters} options={options} onChange={setFilters} />
      <ResultsList results={results} total={total} onPick={pickResult} />
    </>
  );

  const scrubOnMap = scrub && cardItem ? { lng: scrub.lng, lat: scrub.lat, color: cardItem.color } : null;

  return (
    <div
      className="hub relative flex h-full w-full overflow-hidden overscroll-none bg-surface-gray"
      data-strip={pile && pile.length > 1 && !card ? 'true' : 'false'}
    >
      {isDesktop ? (
        <aside aria-label="Map search and results" className="relative z-20 flex h-full w-[360px] shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface">
          {cardItem ? null : (
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <SearchBar state={filters} onChange={setFilters} />
            </div>
          )}
          {details ?? listBody}
        </aside>
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1">
        {mapFailed ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <p className="text-meta font-bold text-ink">Map unavailable</p>
            <p className="mt-2 max-w-md text-meta text-ink-2">
              This browser cannot use WebGL2, so the interactive map did not start. Try another browser or turn on
              hardware acceleration. The list still works.
            </p>
          </div>
        ) : (
          <ExploreCanvas
            data={data}
            items={items}
            lines={shownLines}
            selection={card}
            highlight={current}
            onSelect={select}
            onPile={openPile}
            pile={pile}
            basemap={basemap}
            threeD={threeD}
            onThreeDGesture={onThreeDGesture}
            onUserPan={lowerSheet}
            onMapError={() => setMapFailed(true)}
            bottomInset={!isDesktop && card && card.kind !== 'photo' ? panelHeight : 0}
            scrub={scrubOnMap}
          />
        )}

        {mapFailed ? null : (
          <div ref={controlsRef} className="absolute right-2.5 top-[10.25rem] z-10 flex flex-col items-end gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label="Map layers"
                aria-expanded={layersOpen}
                aria-haspopup="menu"
                onClick={() => setLayersOpen((open) => !open)}
                className={`btn ui-press flex h-11 w-11 items-center justify-center !p-0 text-ink ${layersOpen ? 'btn-yellow' : ''}`}
              >
                <LayersIcon className="h-5 w-5" />
              </button>
              {layersOpen ? (
                <div role="menu" aria-label="Map layers" className="ui-panel ui-sheet-in absolute right-full top-0 z-20 mr-2 flex min-w-40 flex-col gap-1 p-1">
                  {BASEMAPS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={basemap === id}
                      onClick={() => {
                        setBasemap(id);
                        setLayersOpen(false);
                      }}
                      className={`btn flex min-h-11 items-center !px-3 !py-0 text-left text-sm font-bold uppercase ${basemap === id ? 'btn-yellow' : 'text-ink'}`}
                    >
                      {BASEMAP_LABELS[id]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-pressed={threeD}
              aria-label={threeD ? 'Switch to flat map' : 'Switch to 3D terrain'}
              onClick={() => changeThreeD(!threeD)}
              className={`btn ui-press flex h-11 w-11 items-center justify-center !p-0 text-sm font-bold ${threeD ? 'btn-green' : 'text-ink'}`}
            >
              3D
            </button>
          </div>
        )}

        {!mapFailed && total === 0 ? (
          <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-surface/90 px-3 py-1.5 text-caption text-ink-2 shadow-panel">
            Nothing on the map yet.
          </p>
        ) : null}
        {!mapFailed && total > 0 && items.length === 0 ? (
          <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-surface/90 px-3 py-1.5 text-caption text-ink-2 shadow-panel">
            Nothing matches your filters.
          </p>
        ) : null}

        {hint ? (
          <div role="status" className="explore-hint pointer-events-none absolute inset-x-0 bottom-[calc(108px+env(safe-area-inset-bottom))] z-10 flex justify-center px-14 md:bottom-16">
            <p className="max-w-[340px] rounded-panel bg-ink/85 px-4 py-2.5 text-center text-caption text-on-dark shadow-panel backdrop-blur-md">
              {hint === 'touch'
                ? 'Drag with two fingers up or down to tilt, twist to rotate, pinch to zoom.'
                : 'Right-click and drag (or Ctrl + drag) to tilt and rotate. Scroll to zoom.'}
            </p>
          </div>
        ) : null}

        {pile && pile.length > 1 && !card ? (
          <PileStrip
            data={data}
            members={pile}
            index={pileIndex}
            onIndexChange={setPileIndex}
            onOpen={(member) => select({ ...member, fly: true })}
            onClose={() => select(null)}
            bottomOffset={isDesktop ? 0 : panelHeight}
          />
        ) : null}
      </div>

      {isDesktop ? null : (
        <MapSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightChange={setPanelHeight}
          header={<SearchBar state={filters} onChange={setFilters} onFocus={raiseSheetForSearch} />}
        >
          {details ?? listBody}
        </MapSheet>
      )}
    </div>
  );
}
