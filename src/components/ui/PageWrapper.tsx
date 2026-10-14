'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { CommunitySubnav } from '@/components/ui/CommunitySubnav';

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
      <CommunitySubnav />
      {children}
    </motion.div>
  );
} 