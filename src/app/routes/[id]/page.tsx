import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { RouteTitleForm } from '@/components/routes/RouteTitleForm';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Card } from '@/components/hub/Card';
import { deleteRouteAction } from '@/app/library/actions';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { LinkedText } from '@/components/ui/LinkedText';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { loadRoute } from '@/lib/library';
import { seesWholeRoute } from '@/lib/route-privacy';
import { canEditOwned } from '@/lib/membership';
import { loadMapDataNear } from '@/lib/posts';
import { listTripChoices, tripsForItem } from '@/lib/trips';
import { loadFailed } from '@/lib/load-error';
import { formatTripDate } from '@/lib/utils';
import { HubPage } from '@/components/hub/Page';

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
        <HubPage title="Route" width="3xl">
          <Card>
            <p className="text-sm font-bold">Postgres is not connected, so this route cannot be loaded.</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }

  const viewer = await getViewer();
  let route: Awaited<ReturnType<typeof loadRoute>> = null;
  let error: string | null = null;
  try {
    route = await loadRoute(id, viewer?.id ?? null);
  } catch (err) {
    error = loadFailed('route page', err, 'That route did not load. Try again in a minute.');
  }
  if (error) {
    return (
      <PageWrapper>
        <HubPage title="Route" width="3xl">
          <Card>
            <p className="text-sm font-bold">{error}</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }
  if (!route) notFound();

  const manage = Boolean(viewer && canEditOwned({
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
  const map = route.lat != null && route.lng != null ? await loadMapDataNear(viewer?.id ?? null, { routeId: route.id }).catch(() => null) : null;

  return (
    <PageWrapper leaf={route.name}>
      <HubPage
        title={route.name}
        width="3xl"
        subtitle={
          <>
            {route.date ? `${formatTripDate(route.date, 'long')} · ` : ''}
            {isActivity(route.activity) ? ACTIVITY_META[route.activity].label : route.activity}
            {route.distanceM != null ? ` · ${formatMiles(route.distanceM)}` : ''}
            {route.elevGainM != null ? ` · ${formatFeetGain(route.elevGainM)}` : ''}
          </>
        }
      >
        <Card>
          <p className="t-body">
            {route.handle ? <Link href={`/user/${route.handle}`} className="font-bold underline">{route.who}</Link> : route.who}
            {route.hideEnds
              ? seesWholeRoute({ hideEnds: true, ownerId: route.userId }, viewer?.id ?? null)
                ? ' · Start and end hidden from others'
                : ' · Start and end hidden'
              : ''}
          </p>
          {route.notes ? <div className="mt-3"><LinkedText text={route.notes} /></div> : null}
          {manage ? (
            <RouteTitleForm
              key={`${route.title ?? ''}\n${route.notes ?? ''}\n${route.hideEnds}`}
              id={route.id}
              title={route.title ?? ''}
              notes={route.notes ?? ''}
              hideEnds={route.hideEnds}
            />
          ) : null}
        </Card>
        {map && route.lat != null && route.lng != null ? (
          <div className="h-80 min-h-[420px] overflow-hidden bg-white retro-box">
            <MapCanvas points={map.points} lines={map.lines} focus={{ lng: route.lng, lat: route.lat, zoom: 12 }} />
          </div>
        ) : null}
        {manage ? (
          <AddToTrip
            kind="route"
            entityId={route.id}
            trips={tripChoices}
            attached={attachedTrips}
            startOpen={addTrip === '1'}
          />
        ) : null}
        {manage && viewer ? (
          <Card title="Manage">
            <ConfirmDelete
              action={deleteRouteAction}
              confirm="Delete this route?"
              fields={{ id: route.id, returnTo: viewer.handle ? `/user/${viewer.handle}` : '/' }}
            />
          </Card>
        ) : null}
      </HubPage>
    </PageWrapper>
  );
}
