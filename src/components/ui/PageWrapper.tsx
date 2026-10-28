'use client';

import { ReactNode, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { BackBar } from '@/components/ui/BackBar';
import { SectionChrome } from '@/components/ui/SectionChrome';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  /** The last breadcrumb, e.g. the trip or route name. */
  leaf?: string | null;
}

export default function PageWrapper({ children, className = '', leaf = null }: PageWrapperProps) {
  const pathname = usePathname();
  return (
    <div className={`page-frame mt-[72px] min-h-[calc(100vh-72px)] ${className}`}>
      <Suspense fallback={null}>
        <SectionChrome />
        {pathname === '/' ? null : <BackBar leaf={leaf} />}
      </Suspense>
      {children}
    </div>
  );
}
