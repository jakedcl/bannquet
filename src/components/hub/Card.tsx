import Link from 'next/link';
import type { ElementType, ReactNode } from 'react';

/**
 * A panel: rounded white box with the outset bevel and an optional green
 * title bar. `action` sits on the right of the bar (e.g. "See all ›").
 * `titleHref` makes the title a link. `tone="cream"` for notes and empty states.
 */
export function Card({
  as: Tag = 'section',
  title,
  titleHref,
  action,
  className = '',
  bodyClassName = '',
  padded = true,
  tight = false,
  tone = 'white',
  children,
  ...rest
}: {
  as?: ElementType;
  title?: ReactNode;
  titleHref?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  /** Smaller padding, for tables and dense lists. */
  tight?: boolean;
  tone?: 'white' | 'cream';
  children: ReactNode;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  return (
    <Tag className={`panel ${tone === 'cream' ? 'panel-cream' : ''} ${className}`} {...rest}>
      {title ? (
        <header className="panel-bar">
          <span className="min-w-0 flex-1 truncate">
            {titleHref ? <Link href={titleHref} className="-my-2 flex min-h-11 items-center truncate">{title}</Link> : title}
          </span>
          {action ? <span className="shrink-0">{action}</span> : null}
        </header>
      ) : null}
      <div className={`min-w-0 ${padded ? (tight ? 'p-2 sm:p-3' : 'p-3 sm:p-4') : ''} ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}
