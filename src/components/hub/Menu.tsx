'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** A small popover menu for the desktop bar. Closes on outside click, Escape, or navigation. */
export function Menu({
  label,
  active = false,
  align = 'left',
  children,
}: {
  label: ReactNode;
  active?: boolean;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const [openOn, setOpenOn] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openOn === pathname;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpenOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOn(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={barLinkClass(active || open)}
      >
        {label}
        <svg viewBox="0 0 12 8" className="ml-1 h-2 w-2.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1.5 1.5L6 6l4.5-4.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          onClick={() => setOpenOn(null)}
          className={`ui-glass ui-sheet-in absolute top-full z-50 mt-2 min-w-48 overflow-hidden rounded-2xl p-1.5 shadow-[var(--ui-shadow-lg)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function barLinkClass(active: boolean): string {
  return `ui-press inline-flex h-9 items-center rounded-full px-3.5 text-[0.9375rem] font-medium no-underline ${
    active ? 'bg-ui-fill text-ui-label' : 'text-ui-label-2 hover:text-ui-label'
  }`;
}

export const menuRowClass =
  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[0.9375rem] text-ui-label no-underline ui-row-press';
