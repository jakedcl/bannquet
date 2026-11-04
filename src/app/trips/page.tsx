import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/hub/Button';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { viewerCanContribute } from '@/lib/membership';
import { listTrips, type TripSummary } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';
import { ListGroup, ListRow } from '@/components/hub/ListRow';

export const dynamic = 'force-dynamic';

function isUpcoming(tripDate: string | null): boolean {
  if (!tripDate) return true;
  const today = new Date().toISOString().slice(0, 10);
  return tripDate >= today;
}

export default async function TripsPage() {
  const viewer = await getViewer();
  let trips: TripSummary[] = [];
  let error: string | null = null;
  if (!isDatabaseConfigured()) {
    error = 'Postgres is not connected, so trips cannot load.';
  } else {
    try {
      trips = await listTrips();
    } catch (err) {
      error = loadFailed('trips list', err, 'Trips did not load. Try again in a minute.');
    }
  }
  const canAdd = viewerCanContribute(viewer);
  const upcoming = trips.filter((trip) => isUpcoming(trip.tripDate));
  const past = trips.filter((trip) => !isUpcoming(trip.tripDate));

  return (
    <PageWrapper>
      <HubPage title="Trips" width="3xl" trailing={canAdd ? <Button href="/upload?kind=trip" tone="yellow">+ New trip</Button> : null}>
        {error ? <p className="t-body font-bold">{error}</p> : trips.length === 0 ? <p className="t-body">No trips yet.</p> : (
          <>
            <TripGroup label="Upcoming" trips={upcoming} empty="Nothing coming up." />
            <TripGroup label="Past" trips={past} empty="No past trips yet." />
          </>
        )}
      </HubPage>
    </PageWrapper>
  );
}

function TripGroup({ label, trips, empty }: { label: string; trips: TripSummary[]; empty: string }) {
  return (
    <Card title={label} padded={trips.length === 0}>
      {trips.length === 0 ? <p className="text-sm text-gray-700">{empty}</p> : (
        <ListGroup bare>
          {trips.map((trip) => (
            <ListRow key={trip.id} href={`/trips/${trip.id}`} title={trip.title} subtitle={formatTripDate(trip.tripDate)} />
          ))}
        </ListGroup>
      )}
    </Card>
  );
}
