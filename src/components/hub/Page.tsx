import type { ReactNode } from 'react';
import { LargeTitle } from './SectionHeader';

const WIDTH = {
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const;

/** One page body: the column, the page title, then sections and windows. */
export function HubPage({
  title,
  subtitle,
  eyebrow,
  trailing,
  width = '3xl',
  className = '',
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  trailing?: ReactNode;
  width?: keyof typeof WIDTH;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${WIDTH[width]} space-y-5 px-4 pb-12 pt-6 md:pt-8 ${className}`}>
      <LargeTitle title={title} subtitle={subtitle} eyebrow={eyebrow} trailing={trailing} />
      {children}
    </div>
  );
}
