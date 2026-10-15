import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { deleteTripAction, linkPost, toggleGoing } from '@/app/trips/actions';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { canContribute, canDeleteOwned } from '@/lib/membership';
import { getTrip, listAuthorPosts } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { getWeather } from '@/lib/weather';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured()) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  const viewer = await getViewer();
  const canEdit = Boolean(viewer && canContribute(viewer.role));
  const canRsvp = !viewer || canContribute(viewer.role);
  const canDeleteTrip = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: trip.createdBy,
  }));
  const going = Boolean(viewer && trip.people.some((person) => person.id === viewer.id));
  const posts = viewer && canEdit ? await listAuthorPosts(viewer.id) : [];
  const unlinked = posts.filter((post) => post.tripId !== trip.id);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={trip.title}>
          <p className="text-sm">
            {formatTripDate(trip.tripDate, 'long')}
            {trip.activity && isActivity(trip.activity) ? ` · ${ACTIVITY_META[trip.activity].label}` : ''}
          </p>
          {trip.trailheadName ? <p className="mt-1 text-sm">Trailhead: {trip.trailheadName}</p> : null}
          {trip.lat != null && trip.lng != null ? (
            <p className="mt-2">
              <Link href={`/map?trip=${trip.id}`} className="text-sm underline">See the pin on the map</Link>
            </p>
          ) : null}
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide">Who is going</p>
            {trip.people.length === 0 ? (
              <p className="text-sm text-gray-700">Nobody yet.</p>
            ) : (
              <ul className="mt-1 text-sm">
                {trip.people.map((person) => (
                  <li key={person.id}>
                    {person.handle ? <Link href={`/user/${person.handle}`} className="underline">{person.name}</Link> : person.name}
                  </li>
                ))}
              </ul>
            )}
            {canRsvp ? (
              <form action={toggleGoing} className="mt-3">
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="going" value={going ? '0' : '1'} />
                <Button type="submit" tone={going ? 'default' : 'yellow'}>{going ? "I'm out" : "I'm in"}</Button>
              </form>
            ) : null}
          </div>
          {canDeleteTrip ? (
            <div className="mt-4">
              <ConfirmDelete
                action={deleteTripAction}
                confirm="Delete this trip?"
                fields={{ id: trip.id }}
              />
            </div>
          ) : null}
        </Window>

        {trip.lat != null && trip.lng != null ? (
          <Window title="Trailhead forecast">
            <TrailheadForecast lat={trip.lat} lng={trip.lng} />
          </Window>
        ) : null}

        <Window title="Posts">
          {trip.posts.length === 0 ? <p className="text-sm">No posts from this trip yet.</p> : (
            <ul className="space-y-1 text-sm">
              {trip.posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/posts/${post.id}`} className="font-bold underline">{post.title}</Link>
                  <span className="ml-2 text-gray-700">{formatTripDate(post.tripDate)}</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && unlinked.length > 0 ? (
            <form action={linkPost} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="tripId" value={trip.id} />
              <select name="postId" className="retro-box-inset bg-white px-3 py-2">
                {unlinked.map((post) => (
                  <option key={post.id} value={post.id}>{post.title}</option>
                ))}
              </select>
              <Button type="submit">Link this post</Button>
            </form>
          ) : null}
        </Window>
      </div>
    </PageWrapper>
  );
}

async function TrailheadForecast({ lat, lng }: { lat: number; lng: number }) {
  let days: Awaited<ReturnType<typeof getWeather>>['dailyForecast'] = [];
  let failed = false;
  try {
    const weather = await getWeather(lat, lng);
    days = (weather.dailyForecast ?? []).slice(0, 4);
  } catch {
    failed = true;
  }
  if (failed) return <p className="text-sm">The trailhead forecast did not load.</p>;
  if (!days || days.length === 0) return <p className="text-sm">No daily forecast came back for that pin.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {days.map((day) => (
        <li key={day.startTime}>
          <span className="font-bold">{day.name}</span>
          {day.secondaryTemp != null ? ` ${day.temperature}° / ${day.secondaryTemp}°` : ` ${day.temperature}°`}
          {day.shortForecast ? ` · ${day.shortForecast}` : ''}
          {day.windSpeed ? ` · wind ${day.windSpeed}` : ''}
        </li>
      ))}
    </ul>
  );
}
