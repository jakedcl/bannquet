'use client';

import { RegionProvider } from '@/contexts/RegionContext';
import { UserMapProvider } from '@/contexts/UserMapContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RegionProvider>
      <UserMapProvider>
        {children}
      </UserMapProvider>
    </RegionProvider>
  );
} 