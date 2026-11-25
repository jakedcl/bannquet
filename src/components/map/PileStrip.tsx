'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from '@/components/hub/Icons';
import { findItem, itemKey, thumbSrc, type ExploreData, type ItemKind, type MapItem } from '@/lib/map-explore';
import { formatTripDate } from '@/lib/utils';

type Member = { kind: ItemKind; id: string };

/** Swipeable cards for the photos, pins and routes stacked at one spot on the map ("2 of 6"). */
export function PileStrip({ data, members, index, onIndexChange, onOpen, onClose, bottomOffset = 0 }: {
  data: ExploreData;
  members: Member[];
  index: number;
  onIndexChange: (index: number) => void;
  onOpen: (member: Member) => void;
  onClose: () => void;
  /** Room to leave under the strip for a sheet covering the bottom of the map (phones). */
  bottomOffset?: number;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const latest = useRef({ index, count: members.length, onClose });
  useEffect(() => {
    latest.current = { index, count: members.length, onClose };
  });
  // ← and → step through the stack; Escape closes it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const { index: at, count, onClose: close } = latest.current;
      if (event.key === 'Escape') {
        close();
        return;
      }
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = Math.min(count - 1, Math.max(0, at + step));
      const card = scroller.current?.children[next] as HTMLElement | undefined;
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const first = node.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + 12;
    const next = Math.min(members.length - 1, Math.max(0, Math.round(node.scrollLeft / step)));
    if (next !== index) onIndexChange(next);
  };

  return (
    <div
      className="explore-strip pointer-events-none absolute inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-20 md:bottom-6 md:left-1/2 md:right-auto md:w-[640px] md:-translate-x-1/2"
      style={bottomOffset > 0 ? { bottom: bottomOffset + 12 } : undefined}
    >
      <div className="mb-2 flex justify-center">
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close stack (${index + 1} of ${members.length})`}
          className="pointer-events-auto flex min-h-9 items-center gap-1.5 rounded-full bg-ink/85 py-1.5 pl-3.5 pr-3 text-caption font-bold text-on-dark shadow-bar backdrop-blur-md"
        >
          <span>{index + 1} of {members.length}</span>
          <CloseIcon className="h-3.5 w-3.5 opacity-80" />
        </button>
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc(50%-110px)] pb-2 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {members.map((member, i) => {
          const item = findItem(data, member);
          return item ? <PileCard key={itemKey(member)} item={item} active={i === index} onOpen={() => onOpen(member)} /> : null;
        })}
      </div>
    </div>
  );
}

function PileCard({ item, active, onOpen }: { item: MapItem; active: boolean; onOpen: () => void }) {
  const src = thumbSrc(item, 480);
  const dashed = item.kind === 'route' && !['bike', 'ski', 'snowboard'].includes(item.activity ?? '');
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      className={`relative h-[150px] w-[220px] shrink-0 snap-center overflow-hidden rounded-panel bg-ink text-left shadow-panel ring-1 ring-on-dark/20 transition-transform duration-200 active:scale-[0.98] ${
        active ? 'scale-100' : 'scale-[0.93] opacity-90'
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 text-on-dark" style={{ background: `linear-gradient(160deg, ${item.color} 0%, var(--color-ink) 78%)` }}>
          <svg viewBox="0 0 220 150" className="h-full w-full opacity-40" aria-hidden>
            {item.kind === 'route' ? (
              <path
                d="M14 108 C48 38, 86 122, 118 58 S176 28, 206 72"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={dashed ? '10 8' : undefined}
              />
            ) : (
              <circle cx="110" cy="62" r="16" fill="currentColor" />
            )}
          </svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/75 via-ink/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-on-dark">
        <p className="truncate text-meta font-bold leading-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">{item.title}</p>
        <p className="mt-0.5 truncate text-caption text-on-dark/80">
          {[item.who, item.date ? formatTripDate(item.date) : null].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  );
}
