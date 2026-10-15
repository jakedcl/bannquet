import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { canContribute } from '@/lib/membership';
import { listTrips, type TripSummary } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';

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
      error = err instanceof Error ? err.message : 'Trips did not load.';
    }
  }
  const canAdd = !viewer || canContribute(viewer.role);
  const upcoming = trips.filter((trip) => isUpcoming(trip.tripDate));
  const past = trips.filter((trip) => !isUpcoming(trip.tripDate));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title="Trips" action={canAdd ? <Button href="/trips/new" tone="yellow">+ New trip</Button> : null}>
          {error ? <p className="text-sm font-bold">{error}</p> : trips.length === 0 ? <p className="text-sm">No trips yet.</p> : (
            <div className="space-y-4">
              <TripGroup label="Upcoming" trips={upcoming} empty="Nothing coming up." />
              <TripGroup label="Past" trips={past} empty="No past trips yet." />
            </div>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}

function TripGroup({ label, trips, empty }: { label: string; trips: TripSummary[]; empty: string }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide">{label}</h2>
      {trips.length === 0 ? <p className="mt-1 text-sm text-gray-700">{empty}</p> : (
        <ul className="mt-1 space-y-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/trips/${trip.id}`} className="font-bold underline">{trip.title}</Link>
              <span className="ml-2 text-sm text-gray-700">{formatTripDate(trip.tripDate)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
