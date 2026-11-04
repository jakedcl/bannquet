import type { ElementType, ReactNode } from 'react';

export function Card({
  as: Tag = 'section',
  className = '',
  padded = true,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  padded?: boolean;
  children: ReactNode;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <Tag className={`ui-card min-w-0 ${padded ? 'p-4 sm:p-5' : 'overflow-hidden'} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
