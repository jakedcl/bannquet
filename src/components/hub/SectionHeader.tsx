import type { ReactNode } from 'react';

/** A heading inside a page, e.g. a sub-region on a state's weather page. */
export function SectionHeader({
  title,
  subtitle,
  action,
  id,
  as: Tag = 'h2',
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="ui-section-title flex min-w-0 items-end justify-between gap-3">
        <Tag id={id} className="t-title2 min-w-0 text-ui-label">{title}</Tag>
        {action ? <div className="t-subhead shrink-0">{action}</div> : null}
      </div>
      {subtitle ? <p className="t-subhead mt-1 text-ui-label-2">{subtitle}</p> : null}
    </div>
  );
}

/** The page title: big uppercase heading with the green rule under it. */
export function LargeTitle({
  title,
  subtitle,
  eyebrow,
  trailing,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <header className="ui-page-title flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="t-eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="t-large-title break-words text-ui-label">{title}</h1>
        {subtitle ? <p className="t-body mt-1 text-ui-label-2">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
