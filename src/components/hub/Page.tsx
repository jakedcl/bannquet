import type { ReactNode } from 'react';
import { PageHero } from './PageHero';

const WIDTH = {
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const;

/** One page body: the green title band, then the column of sections and panels. */
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
    <>
      <PageHero title={title} subtitle={subtitle} eyebrow={eyebrow} trailing={trailing} innerClassName={WIDTH[width]} />
      <div className={`mx-auto w-full ${WIDTH[width]} space-y-4 px-4 pb-12 pt-4 md:pt-6 ${className}`}>
        {children}
      </div>
    </>
  );
}
