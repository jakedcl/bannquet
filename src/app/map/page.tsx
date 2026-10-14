import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { isDatabaseConfigured } from '@/db';
import { MAP_CENTER } from '@/lib/map';
import { loadMapData } from '@/lib/posts';

export const dynamic = 'force-dynamic';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; post?: string; trip?: string }>;
}) {
  const params = await searchParams;
  const data = isDatabaseConfigured() ? await loadMapData() : { points: EMPTY, lines: EMPTY };
  const focusId = params.track || params.post || params.trip;
  const focusFeature = focusId
    ? data.points.features.find((feature) => {
      const href = String(feature.properties.href ?? '');
      const trackId = String(feature.properties.trackId ?? '');
      return href.endsWith(`/${focusId}`) || trackId === focusId;
    })
    : null;
  const coordinates = focusFeature?.geometry.type === 'Point' ? focusFeature.geometry.coordinates : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-container px-4 py-4 md:py-6">
        <div className="retro-box retro-window h-[calc(100dvh-var(--header-offset)-4.5rem)] min-h-[420px] overflow-hidden bg-paper-raised">
          <MapCanvas
            points={data.points}
            lines={data.lines}
            focus={coordinates ? { lng: coordinates[0], lat: coordinates[1], zoom: 12 } : { ...MAP_CENTER, zoom: 8 }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
