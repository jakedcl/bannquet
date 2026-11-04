'use client';

import { useRef, type ReactNode, type PointerEvent } from 'react';

/**
 * Apple Maps style card over a full-screen map. On a phone it is a bottom sheet
 * with two heights (peek and open); drag or tap the grabber to switch. From
 * md up it is a floating side panel that is always open.
 */
export function Sheet({
  expanded,
  onExpandedChange,
  header,
  children,
  label,
}: {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  header: ReactNode;
  children: ReactNode;
  label: string;
}) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) < 24) return;
    start.moved = true;
    if (dy < 0 && !expanded) onExpandedChange(true);
    if (dy > 0 && expanded) onExpandedChange(false);
    drag.current = { y: event.clientY, moved: true };
  };
  const onPointerUp = () => {
    const start = drag.current;
    drag.current = null;
    if (start && !start.moved) onExpandedChange(!expanded);
  };

  return (
    <section
      aria-label={label}
      data-expanded={expanded ? 'true' : 'false'}
      className={[
        'hub-bar ui-glass pointer-events-auto absolute z-20 flex flex-col overflow-hidden',
        'inset-x-2 bottom-2 rounded-[22px] shadow-[var(--ui-shadow-lg)]',
        'transition-[max-height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
        expanded ? 'max-h-[min(72%,560px)]' : 'max-h-[8.5rem]',
        'md:inset-x-auto md:bottom-auto md:left-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[360px] md:rounded-[18px]',
      ].join(' ')}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        aria-expanded={expanded}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onExpandedChange(!expanded);
          }
        }}
        className="flex h-5 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
      >
        <span className="h-[5px] w-9 rounded-full bg-ui-fill-2" />
      </div>
      <div className="shrink-0 px-4 pb-2 md:pt-4">{header}</div>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 ${expanded ? '' : 'max-md:invisible'}`}>
        {children}
      </div>
    </section>
  );
}
