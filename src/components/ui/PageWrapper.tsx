'use client';

import { motion } from 'framer-motion';
import { ReactNode, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { BackBar, LeafProvider } from '@/components/ui/BackBar';
import { SectionChrome } from '@/components/ui/SectionChrome';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className = '' }: PageWrapperProps) {
  const pathname = usePathname();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`page-frame mt-[72px] min-h-[calc(100vh-72px)] ${className}`}
    >
      <LeafProvider>
        <Suspense fallback={null}>
          <SectionChrome />
          {pathname === '/' ? null : <BackBar />}
        </Suspense>
        {children}
      </LeafProvider>
    </motion.div>
  );
} 