'use client';

import dynamic from 'next/dynamic';
import type { MapFeatureCollection } from '@/lib/posts';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), {
  ssr: false,
  loading: () => <p className="absolute left-3 top-3 z-10 text-xs font-bold uppercase">Loading the map…</p>,
});

export function MapCanvas({
  points,
  lines,
  focus,
  preview = false,
}: {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  focus?: { lng: number; lat: number; zoom?: number } | null;
  preview?: boolean;
}) {
  return (
    <div className={`relative h-full w-full ${preview ? 'pointer-events-none' : ''}`}>
      <GroupMap points={points} lines={lines} focus={focus} preview={preview} />
    </div>
  );
}
