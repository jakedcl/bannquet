import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronIcon } from './Icons';

/** A list of rows split by thin lines. `bare` drops the box when it already sits in a Card. */
export function ListGroup({
  children,
  className = '',
  bare = false,
  'aria-label': label,
}: {
  children: ReactNode;
  className?: string;
  bare?: boolean;
  'aria-label'?: string;
}) {
  return (
    <ul aria-label={label} className={`ui-list min-w-0 ${bare ? '' : 'ui-inset'} ${className}`}>
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
        <span className="t-headline block truncate text-ui-label">{title}</span>
        {subtitle ? <span className="t-footnote mt-0.5 block truncate text-ui-label-2">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="t-subhead shrink-0 text-right text-ui-label-2">{trailing}</span> : null}
      {showChevron ? <ChevronIcon className="h-3 w-2 shrink-0 text-brand-green" /> : null}
    </>
  );
  const rowClass = 'flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2 no-underline';
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
