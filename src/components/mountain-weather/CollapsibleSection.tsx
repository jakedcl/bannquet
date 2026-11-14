'use client';

import { useId, useState } from 'react';

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className="retro-box border-[#5c3a1e] bg-beige/80">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left md:cursor-default md:pointer-events-none"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wide">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs text-gray-700">{subtitle}</span> : null}
        </span>
        <span className="text-lg font-bold leading-none md:hidden" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id={panelId} className={`border-t border-[#5c3a1e]/40 px-4 py-3 ${open ? 'block' : 'hidden md:block'}`}>
        {children}
      </div>
    </section>
  );
}
