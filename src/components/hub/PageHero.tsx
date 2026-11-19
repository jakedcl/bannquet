import type { ReactNode } from 'react';

/**
 * The green title band at the top of a page: optional yellow eyebrow, the
 * page title in white caps, an optional subtitle and something on the right
 * (an avatar button, a primary action). Full width; `innerClassName` lines
 * the text up with the page column.
 */
export function PageHero({
  title,
  eyebrow,
  subtitle,
  trailing,
  innerClassName = 'max-w-3xl',
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  innerClassName?: string;
}) {
  return (
    <header className="page-hero">
      <div className={`mx-auto flex w-full min-w-0 items-center gap-3 px-4 py-3.5 ${innerClassName}`}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="eyebrow mb-0.5 text-yellow">{eyebrow}</p> : null}
          <h1 className="page-hero-title">{title}</h1>
          {subtitle ? <p className="mt-1 text-meta text-on-dark/90">{subtitle}</p> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </header>
  );
}
