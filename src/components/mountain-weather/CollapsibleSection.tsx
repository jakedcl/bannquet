'use client';

import { createContext, useContext, useId, useState } from 'react';

/** True inside another CollapsibleSection, so nested ones draw lighter. */
const Nested = createContext(false);

/**
 * A weather panel that opens and closes. Top level: rounded panel with the
 * green title bar and the source line under it. Inside another section:
 * a lighter row with a chevron, so nested bulletins and sub-tables do not
 * stack title bars. Opening animates the height (grid rows 0fr to 1fr).
 */
export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  /** Source and context line, e.g. "National Weather Service · measured". */
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const nested = useContext(Nested);
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const body = (
    <div id={panelId} className="collapse-body" data-open={open ? 'true' : 'false'}>
      <div className="min-h-0 overflow-hidden">
        <div className={nested ? 'px-3 pb-3 pt-1' : 'px-3.5 py-3 sm:px-4'}>
          <Nested.Provider value={true}>{children}</Nested.Provider>
        </div>
      </div>
    </div>
  );

  if (nested) {
    return (
      <section className="tile my-2 overflow-hidden">
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-meta font-bold [overflow-wrap:anywhere]">{title}</span>
            {subtitle ? <span className="block text-caption text-ink-2">{subtitle}</span> : null}
          </span>
          <Chevron open={open} />
        </button>
        {body}
      </section>
    );
  }

  return (
    <section className="panel">
      <button
        type="button"
        className="panel-bar w-full text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{title}</span>
        <Chevron open={open} />
      </button>
      {subtitle ? (
        <p className="border-b border-hairline bg-surface-cream px-3.5 py-1.5 text-caption text-ink-2 sm:px-4">{subtitle}</p>
      ) : null}
      {body}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 transition-transform duration-[var(--duration-menu)] ease-soft motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
    >
      <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
