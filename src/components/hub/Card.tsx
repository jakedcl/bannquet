import Link from 'next/link';
import type { ElementType, ReactNode } from 'react';

/**
 * The retro window: white box, one outset bevel, optional green title bar.
 * `titleHref` makes the title bar a link (e.g. a state card on the weather hub).
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
  children: ReactNode;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  return (
    <Tag className={`ui-card min-w-0 ${className}`} {...rest}>
      {title ? (
        <header className="ui-card-bar">
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
