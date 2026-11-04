import { MapHome } from '@/components/map/MapHome';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { MAP_CENTER } from '@/lib/map';
import { loadMapData } from '@/lib/posts';

export const dynamic = 'force-dynamic';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; post?: string; pin?: string; photo?: string }>;
}) {
  const params = await searchParams;
  const data = isDatabaseConfigured() ? await loadMapData((await getViewer())?.id ?? null) : { points: EMPTY, lines: EMPTY };
  const focusId = params.track || params.post || params.pin || params.photo;
  const focusFeature = focusId
    ? data.points.features.find((feature) => {
      const href = String(feature.properties.href ?? '');
      const trackId = String(feature.properties.trackId ?? '');
      return href.endsWith(`/${focusId}`) || trackId === focusId;
    })
    : null;
  const coordinates = focusFeature?.geometry.type === 'Point' ? focusFeature.geometry.coordinates : null;

  return (
    <div className="map-bleed hub fixed inset-x-0 top-[var(--bar-h)] bottom-[var(--tab-h)] z-0 overflow-hidden">
      <MapHome
        points={data.points}
        lines={data.lines}
        focus={coordinates ? { lng: coordinates[0], lat: coordinates[1], zoom: 12 } : { ...MAP_CENTER, zoom: 8 }}
      />
    </div>
  );
}
