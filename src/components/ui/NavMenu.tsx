'use client';

import { useState, type ReactNode } from 'react';
import { NavButton, navButtonClass } from './NavButton';

export function NavMenu({
  href,
  label,
  active = false,
  align = 'left',
  size = 'md',
  layout = 'hover',
  open,
  onOpen,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  align?: 'left' | 'right';
  size?: 'md' | 'lg';
  layout?: 'hover' | 'inline' | 'responsive';
  open?: boolean;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const expanded = open ?? localOpen;
  const reveal = () => {
    if (onOpen) onOpen();
    else setLocalOpen(true);
  };
  const hover = layout !== 'inline';
  const inline = layout !== 'hover';

  return (
    <div className={layout === 'responsive' ? 'relative w-full sm:w-auto' : layout === 'inline' ? 'w-full' : 'relative inline-flex'}>
      {hover ? (
        <div className={`group relative ${layout === 'responsive' ? 'hidden sm:inline-flex' : 'inline-flex'}`}>
          <NavButton href={href} active={active} size={size}>{label}</NavButton>
          <div className={`nav-drop absolute top-full z-40 w-max min-w-full flex-col gap-1 bg-[#5c3a1e] p-1 ${align === 'right' ? 'right-0' : 'left-0'}`}>
            {children}
          </div>
        </div>
      ) : null}
      {inline ? (
        <div className={layout === 'responsive' ? 'sm:hidden' : undefined}>
          {expanded ? (
            <NavButton href={href} active={active} size={size} className="w-full">{label}</NavButton>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              onClick={reveal}
              className={navButtonClass(active, 'w-full', size)}
            >
              {label}
            </button>
          )}
          <div
            className="grid transition-[grid-template-rows] duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
            style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden" inert={!expanded}>
              <div className="flex flex-col gap-1 bg-[#5c3a1e] p-1">
                {children}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
