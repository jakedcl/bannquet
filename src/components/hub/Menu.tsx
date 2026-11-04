'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { navButtonClass } from '@/components/ui/NavButton';

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
        className={navButtonClass(active || open, 'gap-1.5')}
      >
        {label}
        <svg viewBox="0 0 12 8" className="h-2 w-2.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1.5 1.5L6 6l4.5-4.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          onClick={() => setOpenOn(null)}
          className={`ui-sheet-in absolute top-full z-50 flex w-max min-w-full flex-col gap-1 bg-[#5c3a1e] p-1 shadow-[4px_4px_8px_rgba(0,0,0,0.3)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Top bar link: the brown trail-sign button from the old header. */
export function barLinkClass(active: boolean): string {
  return navButtonClass(active);
}

export const menuRowClass =
  'retro-button-yellow flex w-full items-center justify-between gap-3 rounded-none px-3 py-1.5 text-left text-xs font-bold uppercase no-underline';
