'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRegion } from '@/contexts/RegionContext';
import { REGION_MAP_CONFIG } from '@/lib/regions';

// Use dynamic import to avoid SSR issues with mapbox-gl
const AdirondacksMap = dynamic(
  () => import('./AdirondacksMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-72px)] w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default function MapClientWrapper() {
  const [mounted, setMounted] = useState(false);
  const { region } = useRegion();
  const config = REGION_MAP_CONFIG[region];

  // Only render the map after component is mounted to ensure it's client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[calc(100vh-72px)] w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green mb-4"></div>
          <p className="text-gray-600">Initializing map...</p>
        </div>
      </div>
    );
  }

  return <AdirondacksMap key={region} region={region} config={config} />;
} 