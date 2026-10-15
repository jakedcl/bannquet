import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { RouteTitleForm } from '@/components/routes/RouteTitleForm';
import { SeeMore } from '@/components/library/AttachReport';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Window } from '@/components/retro/Window';
import { deleteRouteAction } from '@/app/library/actions';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { LinkedText } from '@/components/ui/LinkedText';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { loadRoute } from '@/lib/library';
import { canContribute, canDeleteOwned } from '@/lib/membership';
import { loadMapData } from '@/lib/posts';
import { listTripChoices, tripsForItem } from '@/lib/trips';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addTrip?: string }>;
}) {
  const { id } = await params;
  const { addTrip } = await searchParams;
  if (!ID.test(id)) notFound();
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Window title="Route">
            <p className="text-sm font-bold">Postgres is not connected, so this route cannot be loaded.</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  let route: Awaited<ReturnType<typeof loadRoute>> = null;
  let error: string | null = null;
  try {
    route = await loadRoute(id);
  } catch (err) {
    error = err instanceof Error ? err.message : 'That route did not load.';
  }
  if (error) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Window title="Route">
            <p className="text-sm font-bold">{error}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }
  if (!route) notFound();

  const viewer = await getViewer();
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: route.userId,
  }));
  const [tripChoices, attachedTrips] = viewer && manage
    ? await Promise.all([
      listTripChoices().catch(() => []),
      tripsForItem('route', route.id).catch(() => []),
    ])
    : [[], []];
  const map = route.lat != null && route.lng != null ? await loadMapData().catch(() => null) : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window
          title={route.name}
          action={manage && viewer ? (
            <ConfirmDelete
              action={deleteRouteAction}
              confirm="Delete this route?"
              fields={{ id: route.id, returnTo: viewer.handle ? `/user/${viewer.handle}` : '/' }}
            />
          ) : null}
        >
          <p className="text-sm text-gray-700">
            {isActivity(route.activity) ? ACTIVITY_META[route.activity].label : route.activity}
            {route.distanceM != null ? ` · ${formatMiles(route.distanceM)}` : ''}
            {route.elevGainM != null ? ` · ${formatFeetGain(route.elevGainM)}` : ''}
          </p>
          <p className="mt-2 text-sm">
            {route.handle ? <Link href={`/user/${route.handle}`} className="underline">{route.who}</Link> : route.who}
          </p>
          {route.notes ? <div className="mt-3"><LinkedText text={route.notes} /></div> : null}
          <div className="mt-3">
            <SeeMore post={route.post} />
          </div>
          {viewer && canContribute(viewer.role) && viewer.id === route.userId ? (
            <RouteTitleForm
              key={`${route.title ?? ''}\n${route.notes ?? ''}`}
              id={route.id}
              title={route.title ?? ''}
              notes={route.notes ?? ''}
            />
          ) : null}
        </Window>
        {map && route.lat != null && route.lng != null ? (
          <div className="h-80 min-h-[420px] overflow-hidden bg-white retro-box">
            <MapCanvas points={map.points} lines={map.lines} focus={{ lng: route.lng, lat: route.lat, zoom: 12 }} />
          </div>
        ) : null}
        {viewer && canContribute(viewer.role) && viewer.id === route.userId ? (
          <AddToTrip
            kind="route"
            entityId={route.id}
            trips={tripChoices}
            attached={attachedTrips}
            startOpen={addTrip === '1'}
          />
        ) : null}
      </div>
    </PageWrapper>
  );
}
