import type { ReactNode } from 'react';

/**
 * A plain message panel: empty lists, sources that did not load, places a
 * forecast does not cover. Missing data always says so with one of these
 * instead of leaving a gap.
 */
export function Notice({
  title,
  children,
  action,
  tone = 'neutral',
  className = '',
}: {
  title?: ReactNode;
  children?: ReactNode;
  /** A button or link under the text. */
  action?: ReactNode;
  /** `error`: a source failed. `warn`: a caution worth seeing first. */
  tone?: 'neutral' | 'error' | 'warn';
  className?: string;
}) {
  const edge = tone === 'error' ? 'border-l-6 border-l-danger-bright' : tone === 'warn' ? 'border-l-6 border-l-warn' : '';
  return (
    <div role={tone === 'error' ? 'status' : undefined} className={`panel panel-cream flex flex-col gap-2 px-3.5 py-3 ${edge} ${className}`}>
      {title ? <p className="font-heading text-body font-bold uppercase">{title}</p> : null}
      {children ? <div className="text-meta text-ink-2">{children}</div> : null}
      {action ? <div className="flex flex-wrap gap-2 pt-1">{action}</div> : null}
    </div>
  );
}
