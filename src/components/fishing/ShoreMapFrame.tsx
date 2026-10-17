'use client';

import dynamic from 'next/dynamic';

const ShoreMap = dynamic(() => import('@/components/fishing/ShoreMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map.</p>,
});

export function ShoreMapFrame({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  return <ShoreMap lat={lat} lon={lon} name={name} />;
}
