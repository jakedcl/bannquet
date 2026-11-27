'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { buttonClass, chipClass } from '@/components/hub/Button';
import { CloseIcon } from '@/components/hub/Icons';
import { formatTripDate } from '@/lib/utils';
import {
  activeFilterCount,
  emptyFilters,
  formatFeet,
  formatMiles,
  itemKey,
  itemMeta,
  kindLabel,
  KIND_PILL_LABEL,
  shareParam,
  thumbSrc,
  toggleGroupFilter,
  toggleKindFilter,
  togglePinKindFilter,
  type ExploreFilters,
  type FilterOptions,
  type MapItem,
} from '@/lib/map-explore';
import { formatFeet as formatProfileFeet, routeElevation, type ElevationProfile, type RouteScrubPoint } from '@/lib/route-elevation';

/* ---- Search and pills ----------------------------------------------------- */

/** The search box. It never filters the map; it only finds things in the results list. */
export function SearchBar({ state, onChange, onFocus }: {
  state: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  onFocus?: () => void;
}) {
  return (
    <input
      type="search"
      value={state.query}
      onChange={(event) => onChange({ ...state, query: event.target.value })}
      onFocus={onFocus}
      placeholder="Search routes, photos, pins, people"
      aria-label="Search the map"
      className="h-11 min-w-0 flex-1 !rounded-full !px-4"
    />
  );
}

/**
 * One row of pills. A group's sub-pills appear right after it (activity groups after Routes, pin kinds after
 * Pins). If the row is wider than the panel it scrolls sideways with a fade at the edge that has more.
 */
export function FilterPills({ state, options, onChange }: {
  state: ExploreFilters;
  options: FilterOptions;
  onChange: (next: ExploreFilters) => void;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    // A mouse wheel scrolls the row sideways.
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, [measure]);

  const fade = `linear-gradient(to right, ${edges.left ? 'transparent, black 28px' : 'black, black'}, ${
    edges.right ? 'black calc(100% - 28px), transparent' : 'black, black'
  })`;
  const count = activeFilterCount(state);

  return (
    <div className="flex items-center gap-2 px-4 pb-3">
      <div
        ref={scroller}
        onScroll={measure}
        className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        <div className="flex w-max items-center gap-1.5 py-0.5">
          {options.kinds.map((kind) => (
            <div key={kind} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={state.kinds.includes(kind)}
                onClick={() => onChange(toggleKindFilter(state, kind))}
                className={chipClass(state.kinds.includes(kind))}
              >
                {KIND_PILL_LABEL[kind]}
              </button>
              {kind === 'route' && state.kinds.includes('route')
                ? options.groups.map(({ group, label }) => (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={state.groups.includes(group)}
                    onClick={() => onChange(toggleGroupFilter(state, group))}
                    className={chipClass(state.groups.includes(group), '!min-h-8 !px-2.5 normal-case')}
                  >
                    {label}
                  </button>
                ))
                : null}
              {kind === 'pin' && state.kinds.includes('pin')
                ? options.pinKinds.map((pinKind) => (
                  <button
                    key={pinKind}
                    type="button"
                    aria-pressed={state.pinKinds.includes(pinKind)}
                    onClick={() => onChange(togglePinKindFilter(state, pinKind))}
                    className={chipClass(state.pinKinds.includes(pinKind), '!min-h-8 !px-2.5 normal-case')}
                  >
                    {pinKind}
                  </button>
                ))
                : null}
            </div>
          ))}
        </div>
      </div>
      {count > 0 || state.query.trim() ? (
        <button
          type="button"
          onClick={() => onChange(emptyFilters)}
          className="shrink-0 text-caption font-bold text-ink-2 underline underline-offset-2"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/* ---- Results -------------------------------------------------------------- */

/** A photo's thumbnail, or a tile in the item's colour (a route's line, a pin's dot). */
export function ItemThumb({ item, className = 'h-11 w-11' }: { item: MapItem; className?: string }) {
  const src = thumbSrc(item, 128);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-tag bg-surface-sunken object-cover`} />
    );
  }
  return <ItemArt item={item} className={`${className} shrink-0 rounded-tag`} />;
}

/** A gradient tile in the item's colour with a route squiggle (dashed on foot) or a pin dot. */
function ItemArt({ item, className }: { item: MapItem; className: string }) {
  const dashed = item.kind === 'route' && !['bike', 'ski', 'snowboard'].includes(item.activity ?? '');
  return (
    <div
      aria-hidden
      className={`${className} overflow-hidden`}
      style={{ background: `linear-gradient(160deg, ${item.color} 0%, var(--color-ink) 85%)` }}
    >
      <svg viewBox="0 0 44 44" className="h-full w-full text-on-dark" preserveAspectRatio="xMidYMid slice">
        {item.kind === 'route' ? (
          <>
            <path
              d="M9 31 C13 14, 20 36, 25 22 S33 12, 35 14"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.9"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray={dashed ? '5 4' : undefined}
            />
            <circle cx="9" cy="31" r="3" fill="currentColor" />
            <circle cx="35" cy="14" r="3" fill="currentColor" />
          </>
        ) : (
          <circle cx="22" cy="22" r="6" fill="currentColor" fillOpacity="0.9" />
        )}
      </svg>
    </div>
  );
}

export function ResultsList({ results, total, onPick, countLabel, activeKey }: {
  results: MapItem[];
  total: number;
  onPick: (item: MapItem) => void;
  /** Replaces the "N on the map" line. */
  countLabel?: string;
  /** The row to mark as current (kept in view). */
  activeKey?: string;
}) {
  const activeRow = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [activeKey]);
  return (
    <>
      <p className="px-4 pb-1.5 text-caption text-ink-3">
        {countLabel ?? (results.length === total ? `${total} on the map` : `${results.length} of ${total}`)}
      </p>
      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-hairline pb-[env(safe-area-inset-bottom)]">
        <ul>
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-meta text-ink-2">Nothing matches that.</li>
          ) : (
            results.map((item) => {
              const key = itemKey(item);
              const active = key === activeKey;
              return (
                <li
                  key={key}
                  ref={active ? activeRow : undefined}
                  aria-current={active ? 'true' : undefined}
                  className={active ? 'bg-yellow-soft' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-cream active:bg-surface-gray"
                  >
                    <ItemThumb item={item} />
                    <span className="min-w-0">
                      <span className="block truncate text-meta font-bold text-ink">{item.title}</span>
                      <span className="block truncate text-caption text-ink-2">{itemMeta(item)}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  );
}

/* ---- Details -------------------------------------------------------------- */

function ShareIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M12 3l-4 4M12 3l4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Share sheet where there is one, else copy the link. Returns a "Copied" flag for the label. */
function useShare(item: MapItem) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL('/map', window.location.origin);
    url.searchParams.set(shareParam(item.kind), item.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: url.toString() });
        return;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  return { copied, share };
}

/** Escape closes (unless something above it, like the lightbox, takes it first). */
function useEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, enabled]);
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEscape(onClose);
  return createPortal(
    <div
      role="dialog"
      aria-label={alt}
      onClick={onClose}
      className="explore-lightbox fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-tag object-contain" />
      <button
        type="button"
        aria-label="Close photo"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-on-dark/15 text-on-dark backdrop-blur-md hover:bg-on-dark/25"
      >
        <CloseIcon className="h-[18px] w-[18px]" />
      </button>
    </div>,
    document.body,
  );
}

const OPEN_LABEL: Record<MapItem['kind'], string> = { route: 'Open route', photo: 'Open photo', pin: 'Open pin' };

/**
 * The selected route, pin or photo in the sidebar or the sheet: a back control, a cover, the title and stats, the
 * elevation profile for a route, and links to share or open its page. Escape does the same as Back.
 */
export function DetailsPanel({ item, coords, linked = [], nearby = [], onOpenItem, onBack, onScrub }: {
  item: MapItem;
  /** Saved photo-to-route links (routes only). */
  linked?: MapItem[];
  /** Distance-only matches, excluding saved links (routes only). */
  nearby?: MapItem[];
  onOpenItem?: (item: MapItem) => void;
  /** Route geometry, for the elevation profile. */
  coords: [number, number][] | null;
  onBack: () => void;
  onScrub: (point: RouteScrubPoint | null) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center border-b border-hairline px-2 py-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to results"
          className="flex h-10 items-center gap-1 rounded-full pl-2.5 pr-4 text-meta font-bold text-ink-2 hover:bg-surface-cream"
        >
          <BackIcon />
          Results
        </button>
      </div>
      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        <DetailsBody item={item} coords={coords} linked={linked} nearby={nearby} onOpenItem={onOpenItem} onClose={onBack} onScrub={onScrub} />
      </div>
    </div>
  );
}

function PhotoStrip({ title, items, onOpenItem }: { title: string; items: MapItem[]; onOpenItem: (item: MapItem) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="pt-3">
      <p className="px-4 pb-1.5 text-tag font-bold uppercase tracking-eyebrow text-ink-3">{title}</p>
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((photo) => (
          <button
            key={itemKey(photo)}
            type="button"
            onClick={() => onOpenItem(photo)}
            aria-label={photo.title}
            title={photo.title}
            className="h-16 w-20 shrink-0 overflow-hidden rounded-tag ring-1 ring-hairline active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbSrc(photo, 160) ?? ''} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsBody({ item, coords, linked, nearby, onOpenItem, onClose, onScrub }: {
  item: MapItem;
  linked: MapItem[];
  nearby: MapItem[];
  onOpenItem?: (item: MapItem) => void;
  coords: [number, number][] | null;
  onClose: () => void;
  onScrub: (point: RouteScrubPoint | null) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const { copied, share } = useShare(item);
  useEscape(onClose, !lightbox);
  const cover = item.image ?? null;
  const stats = [
    item.date ? formatTripDate(item.date) : null,
    formatMiles(item.distanceM),
    item.elevGainM ? `↑ ${formatFeet(item.elevGainM)}` : null,
  ].filter((stat): stat is string => Boolean(stat));

  return (
    <article className="pb-3">
      {cover ? (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="View photo full size"
          className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-surface-sunken"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbSrc(item, 640) ?? cover} alt={item.title} className="h-full w-full object-cover" />
        </button>
      ) : null}
      <div className="flex gap-3 px-4 pt-3">
        {cover ? null : <ItemThumb item={item} className="h-[72px] w-[72px]" />}
        <div className="min-w-0 flex-1">
          <p className="text-tag font-bold uppercase tracking-eyebrow text-ink-3">{kindLabel(item)}</p>
          <h2 className="mt-0.5 text-heading font-bold leading-tight text-ink [overflow-wrap:anywhere]">{item.title}</h2>
          <p className="mt-0.5 text-caption text-ink-2">{item.who}</p>
        </div>
      </div>
      {stats.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
          {stats.map((stat) => (
            <span key={stat} className="rounded-full bg-surface-gray px-3 py-1 text-caption font-bold text-ink-2">{stat}</span>
          ))}
        </div>
      ) : null}
      {item.kind === 'photo' && item.linkedTrackId && item.linkedRouteTitle ? (
        <p className="px-4 pt-2.5 text-caption text-ink-2">
          <Link href={`/routes/${item.linkedTrackId}`} className="font-bold underline">
            On route: {item.linkedRouteTitle}
          </Link>
        </p>
      ) : null}
      {onOpenItem ? (
        <>
          <PhotoStrip title="Photos from this route" items={linked} onOpenItem={onOpenItem} />
          <PhotoStrip title="Nearby photos" items={nearby} onOpenItem={onOpenItem} />
        </>
      ) : null}
      {coords && coords.length > 1 ? (
        <div className="px-4 pt-3">
          <ElevationProfileChart coords={coords} color={item.color} onScrub={onScrub} />
        </div>
      ) : null}
      <div className="flex gap-2 px-4 pt-3">
        <Link href={item.href} className={buttonClass('yellow', 'md', 'flex-1')}>
          {OPEN_LABEL[item.kind]}
        </Link>
        <button type="button" onClick={share} className={buttonClass('gray', 'md', 'gap-1.5')} aria-label="Share link">
          <ShareIcon />
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>
      {lightbox && cover ? <Lightbox src={cover} alt={item.title} onClose={() => setLightbox(false)} /> : null}
    </article>
  );
}

/** The card pinned to a photo's spot on the map. */
export function PhotoPopupCard({ item, onClose }: { item: MapItem; onClose: () => void }) {
  const [lightbox, setLightbox] = useState(false);
  const { copied, share } = useShare(item);
  useEscape(onClose, !lightbox);
  const src = item.image ? thumbSrc(item, 640) ?? item.image : null;
  const meta = [item.who, item.date ? formatTripDate(item.date) : null].filter(Boolean).join(' · ');
  return (
    <article className="explore-card hub w-[min(320px,calc(100vw-24px))] max-h-[var(--card-max,520px)] overflow-y-auto overflow-x-hidden rounded-panel bg-surface shadow-panel ring-1 ring-ink/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        {src ? (
          <button type="button" onClick={() => setLightbox(true)} aria-label="View photo full size" className="block h-full w-full cursor-zoom-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={item.title} className="h-full w-full object-cover" />
          </button>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/75 via-ink/30 to-transparent" />
        <button
          type="button"
          onClick={share}
          aria-label="Share link"
          className="absolute left-3 top-3 flex h-9 items-center gap-1.5 rounded-full bg-ink/40 px-3 text-caption font-bold text-on-dark backdrop-blur-md active:scale-95"
        >
          <ShareIcon />
          {copied ? 'Copied' : 'Share'}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/40 text-on-dark backdrop-blur-md active:scale-95"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-on-dark">
          <h2 className="text-stat font-bold leading-tight [overflow-wrap:anywhere] [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">{item.title}</h2>
          {meta ? <p className="mt-0.5 text-caption text-on-dark/80">{meta}</p> : null}
        </div>
      </div>
      {item.linkedTrackId && item.linkedRouteTitle ? (
        <p className="px-3 pb-1 text-caption text-ink-2">
          <Link href={`/routes/${item.linkedTrackId}`} className="font-bold underline">
            On route: {item.linkedRouteTitle}
          </Link>
        </p>
      ) : null}
      <div className="p-3">
        <Link href={item.href} className={buttonClass('yellow', 'md', 'w-full')}>Open photo</Link>
      </div>
      {lightbox && item.image ? <Lightbox src={item.image} alt={item.title} onClose={() => setLightbox(false)} /> : null}
    </article>
  );
}

/* ---- Elevation ------------------------------------------------------------ */

const W = 300;
const H = 56;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-surface-gray px-2.5 py-0.5 text-caption text-ink-2" title={label}>
      <span className="sr-only">{label}: </span>
      {value}
    </span>
  );
}

/** Elevation profile for a route, from terrain tiles in the browser. Drag along it to move a dot on the map. */
export function ElevationProfileChart({ coords, color, onScrub }: {
  coords: [number, number][];
  color: string;
  onScrub: (point: RouteScrubPoint | null) => void;
}) {
  const [state, setState] = useState<{ coords: [number, number][] | null; profile: ElevationProfile | null }>({ coords: null, profile: null });
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    routeElevation(coords)
      .then((profile) => !cancelled && setState({ coords, profile }))
      .catch(() => !cancelled && setState({ coords, profile: null }));
    return () => {
      cancelled = true;
    };
  }, [coords]);

  useEffect(() => () => onScrub(null), [onScrub]);

  const done = state.coords === coords;
  const profile = done ? state.profile : null;

  const pick = (clientX: number) => {
    if (!profile?.lnglats.length || !svgRef.current) return;
    const total = profile.miles[profile.miles.length - 1] || 1;
    const rect = svgRef.current.getBoundingClientRect();
    const target = (Math.min(Math.max(clientX - rect.left, 0), rect.width) / rect.width) * total;
    let index = 0;
    for (let i = 1; i < profile.miles.length; i += 1) {
      if (Math.abs(profile.miles[i]! - target) < Math.abs(profile.miles[index]! - target)) index = i;
    }
    setActive(index);
    const [lng, lat] = profile.lnglats[index]!;
    onScrub({ lng, lat, miles: profile.miles[index]!, feet: profile.feet[index]!, fraction: profile.miles[index]! / total });
  };

  if (done && !profile) return null;
  if (!profile) return <div className="h-[84px] animate-pulse rounded-tag bg-surface-gray" aria-hidden />;

  const { feet, miles, minFeet, maxFeet } = profile;
  const span = Math.max(1, maxFeet - minFeet);
  const total = miles[miles.length - 1] || 1;
  const line = feet
    .map((f, i) => `${((miles[i]! / total) * W).toFixed(1)},${(H - 4 - ((f - minFeet) / span) * (H - 12)).toFixed(1)}`)
    .join(' ');
  const x = active != null ? (miles[active]! / total) * W : null;

  return (
    <div>
      <div className="flex flex-wrap gap-1 pb-1.5">
        <Stat label="Low point" value={`Low ${formatProfileFeet(minFeet)}`} />
        <Stat label="High point" value={`High ${formatProfileFeet(maxFeet)}`} />
        {active != null ? <Stat label="Here" value={`${miles[active]!.toFixed(1)} mi · ${formatProfileFeet(feet[active]!)}`} /> : null}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-14 w-full cursor-crosshair touch-none overflow-visible text-ink"
        role="img"
        aria-label={`Elevation from ${formatProfileFeet(minFeet)} to ${formatProfileFeet(maxFeet)}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse' && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          pick(event.clientX);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'touch') return;
          setActive(null);
          onScrub(null);
        }}
      >
        <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} opacity="0.18" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {x != null ? (
          <line x1={x} x2={x} y1={0} y2={H} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      <p className="mt-1 text-caption text-ink-3">Elevation estimated from terrain data. Drag along it to follow on the map.</p>
    </div>
  );
}

/** Small helper so the explorer can render the panel's "Stacked here" header the same way. */
export function PanelHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <p className="text-meta font-bold text-ink">{children}</p>
      {action}
    </div>
  );
}
