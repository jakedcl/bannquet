'use client';

import { motion } from 'framer-motion';
import { ReactNode, Suspense } from 'react';
import { SectionChrome } from '@/components/ui/SectionChrome';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`page-frame mt-[72px] min-h-[calc(100vh-72px)] ${className}`}
    >
      <Suspense fallback={null}>
        <SectionChrome />
      </Suspense>
      {children}
    </motion.div>
  );
} 