import { MapExplorer } from '@/components/map/MapExplorer';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { selectionFromParams } from '@/lib/map-explore';
import { loadMapData } from '@/lib/posts';

export const metadata = { title: 'Map' };

export const dynamic = 'force-dynamic';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; post?: string; pin?: string; photo?: string }>;
}) {
  const params = await searchParams;
  const data = isDatabaseConfigured() ? await loadMapData((await getViewer())?.id ?? null) : { points: EMPTY, lines: EMPTY };

  return (
    <div className="map-bleed hub fixed inset-x-0 top-[var(--bar-h)] bottom-0 z-0 overflow-hidden">
      <MapExplorer points={data.points} lines={data.lines} initialSelection={selectionFromParams(params)} />
    </div>
  );
}
