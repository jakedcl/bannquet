import { Suspense } from 'react';
import { MapCanvas } from '@/components/map/MapCanvas';
import { BackBar } from '@/components/ui/BackBar';
import { isDatabaseConfigured } from '@/db';
import { MAP_CENTER } from '@/lib/map';
import { loadMapData } from '@/lib/posts';

export const dynamic = 'force-dynamic';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; post?: string; trip?: string; pin?: string; photo?: string }>;
}) {
  const params = await searchParams;
  const data = isDatabaseConfigured() ? await loadMapData() : { points: EMPTY, lines: EMPTY };
  const focusId = params.track || params.post || params.trip || params.pin || params.photo;
  const focusFeature = focusId
    ? data.points.features.find((feature) => {
      const href = String(feature.properties.href ?? '');
      const trackId = String(feature.properties.trackId ?? '');
      return href.endsWith(`/${focusId}`) || trackId === focusId;
    })
    : null;
  const coordinates = focusFeature?.geometry.type === 'Point' ? focusFeature.geometry.coordinates : null;

  return (
    <div className="map-bleed fixed inset-x-0 top-[72px] z-0 flex h-[calc(100dvh-72px)] flex-col overflow-hidden">
      <Suspense fallback={null}>
        <BackBar />
      </Suspense>
      <div className="relative min-h-0 flex-1">
      <MapCanvas
        points={data.points}
        lines={data.lines}
        focus={coordinates ? { lng: coordinates[0], lat: coordinates[1], zoom: 12 } : { ...MAP_CENTER, zoom: 8 }}
      />
      </div>
    </div>
  );
}
