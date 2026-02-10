'use client';

import { RegionProvider } from '@/contexts/RegionContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RegionProvider>
        {children}
    </RegionProvider>
  );
} 