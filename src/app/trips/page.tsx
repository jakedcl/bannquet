import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { canContribute } from '@/lib/membership';
import { listTrips } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function TripsPage() {
  const viewer = await getViewer();
  const trips = isDatabaseConfigured() ? await listTrips() : [];
  const canPlan = Boolean(viewer && canContribute(viewer.role));

  return (
    <PageWrapper>
      <div className="page-shell page-pad space-y-4">
        <Window title="Trips">
          <p className="mb-4 text-sm text-gray-700">
            A date, a trailhead, who is in, and a packing list. The forecast is the same mountain weather as the rest of the site.
          </p>
          {canPlan ? <Button href="/trips/new" tone="yellow">Plan a trip</Button> : null}
          {trips.length === 0 ? (
            <p className="empty-note mt-4 text-sm">No trips yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {trips.map((trip) => (
                <li key={trip.id}>
                  <Link href={`/trips/${trip.id}`} className="font-bold underline">{trip.title}</Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {formatTripDate(trip.tripDate)}
                    {trip.activity && isActivity(trip.activity) ? ` · ${ACTIVITY_META[trip.activity].label}` : ''}
                    {trip.trailheadName ? ` · ${trip.trailheadName}` : ''}
                    {` · ${trip.going} going`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
