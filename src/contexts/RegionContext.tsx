'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_REGION, REGION_STORAGE_KEY, RegionCode, isRegionCode } from '@/lib/regions';

type RegionContextValue = {
  region: RegionCode;
  setRegion: (region: RegionCode) => void;
};

const RegionContext = createContext<RegionContextValue | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<RegionCode>(DEFAULT_REGION);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(REGION_STORAGE_KEY);
    if (isRegionCode(stored)) {
      setRegionState(stored);
    }
  }, []);

  const setRegion = (nextRegion: RegionCode) => {
    setRegionState(nextRegion);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REGION_STORAGE_KEY, nextRegion);
    }
  };

  const value = useMemo(
    () => ({
      region,
      setRegion,
    }),
    [region]
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

