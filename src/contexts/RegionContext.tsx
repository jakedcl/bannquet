'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_REGION, REGION_STORAGE_KEY, RegionCode, isRegionCode } from '@/lib/regions';

type RegionContextValue = {
  region: RegionCode;
  setRegion: (region: RegionCode) => void;
};

const RegionContext = createContext<RegionContextValue | undefined>(undefined);
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readRegion(): RegionCode {
  const stored = window.localStorage.getItem(REGION_STORAGE_KEY);
  return isRegionCode(stored) ? stored : DEFAULT_REGION;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const region = useSyncExternalStore(subscribe, readRegion, () => DEFAULT_REGION);
  const setRegion = useCallback((nextRegion: RegionCode) => {
    window.localStorage.setItem(REGION_STORAGE_KEY, nextRegion);
    emit();
  }, []);

  const value = useMemo(
    () => ({
      region,
      setRegion,
    }),
    [region, setRegion],
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
