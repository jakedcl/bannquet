import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  subtitle,
  action,
  id,
  level = 'title2',
  as: Tag = 'h2',
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  level?: 'title2' | 'title3' | 'headline';
  as?: 'h2' | 'h3';
  className?: string;
}) {
  const size = level === 'title2' ? 't-title2' : level === 'title3' ? 't-title3' : 't-headline';
  return (
    <div className={`flex min-w-0 items-end justify-between gap-3 px-1 ${className}`}>
      <div className="min-w-0">
        <Tag id={id} className={`${size} min-w-0 text-ui-label`}>{title}</Tag>
        {subtitle ? <p className="t-subhead mt-0.5 text-ui-label-2">{subtitle}</p> : null}
      </div>
      {action ? <div className="t-subhead shrink-0">{action}</div> : null}
    </div>
  );
}

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
    <header className="flex min-w-0 items-end justify-between gap-4 px-1">
      <div className="min-w-0">
        {eyebrow ? <p className="t-eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="t-large-title text-ui-label">{title}</h1>
        {subtitle ? <p className="t-body mt-1 text-ui-label-2">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
