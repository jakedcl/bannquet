import type { ReactNode } from 'react';

const SOURCE_LINK_CLASS =
  'font-bold underline break-all [overflow-wrap:anywhere]';

/** External NWS/third-party source link; breaks long hrefs if used as visible text. */
export function SourceLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className ? `${SOURCE_LINK_CLASS} ${className}` : SOURCE_LINK_CLASS}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}