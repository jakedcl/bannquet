import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronIcon } from './Icons';

/** An inset grouped list. Children are ListRows. */
export function ListGroup({
  children,
  className = '',
  inset = '1rem',
  'aria-label': label,
}: {
  children: ReactNode;
  className?: string;
  /** Where the hairline between rows starts, to line up with the row text. */
  inset?: string;
  'aria-label'?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={`ui-card ui-list overflow-hidden ${className}`}
      style={{ ['--row-inset' as string]: inset }}
    >
      {children}
    </ul>
  );
}

export function ListRow({
  href,
  external = false,
  leading,
  title,
  subtitle,
  trailing,
  accessory,
  chevron,
  className = '',
}: {
  href?: string;
  external?: boolean;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** Something interactive after the row, e.g. a remove button. Stays outside the link. */
  accessory?: ReactNode;
  chevron?: boolean;
  className?: string;
}) {
  const showChevron = chevron ?? Boolean(href);
  const body = (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="t-body block truncate text-ui-label">{title}</span>
        {subtitle ? <span className="t-footnote mt-0.5 block truncate text-ui-label-2">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="t-subhead shrink-0 text-right text-ui-label-2">{trailing}</span> : null}
      {showChevron ? <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-ui-label-3" /> : null}
    </>
  );
  const rowClass = 'flex min-h-11 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 no-underline';
  return (
    <li className={`flex min-w-0 items-center ${className}`}>
      {href ? (
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={`${rowClass} ui-row-press`}>{body}</a>
        ) : (
          <Link href={href} className={`${rowClass} ui-row-press`}>{body}</Link>
        )
      ) : (
        <div className={rowClass}>{body}</div>
      )}
      {accessory ? <span className="shrink-0 pr-3">{accessory}</span> : null}
    </li>
  );
}
