'use client';

import dynamic from 'next/dynamic';
import type { MapFeatureCollection } from '@/lib/posts';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), {
  ssr: false,
  loading: () => <p className="p-4 text-sm">Loading the map…</p>,
});

export function MapCanvas({
  points,
  lines,
  focus,
}: {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  focus?: { lng: number; lat: number; zoom?: number } | null;
}) {
  return <GroupMap points={points} lines={lines} focus={focus} />;
}
