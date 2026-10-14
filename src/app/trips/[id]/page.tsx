import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { addItem, linkPost, saveWeight, toggleClaim, toggleGoing } from '@/app/trips/actions';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { canContribute } from '@/lib/membership';
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
            {canEdit && viewer ? (
              <form action={toggleGoing} className="mt-3">
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="going" value={going ? '0' : '1'} />
                <Button type="submit" tone={going ? 'default' : 'yellow'}>{going ? "I'm out" : "I'm in"}</Button>
              </form>
            ) : null}
          </div>
        </Window>

        {trip.lat != null && trip.lng != null ? (
          <Window title="Trailhead forecast">
            <TrailheadForecast lat={trip.lat} lng={trip.lng} />
          </Window>
        ) : null}

        <Window title="Packing list">
          {trip.items.length === 0 ? <p className="text-sm">Nothing on the list yet.</p> : null}
          <ul className="space-y-3">
            {trip.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {item.label}
                  {item.assignedName ? <span className="ml-2 text-gray-600">{item.assignedName}</span> : null}
                  {item.ounces != null ? <span className="ml-2 text-gray-600">{item.ounces} oz</span> : null}
                </span>
                {canEdit ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <form action={toggleClaim}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <Button type="submit">{item.assignedTo === viewer?.id ? 'Leave it' : "I'll carry it"}</Button>
                    </form>
                    <form action={saveWeight} className="flex items-center gap-1">
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input
                        name="ounces"
                        inputMode="decimal"
                        defaultValue={item.ounces ?? ''}
                        placeholder="oz"
                        className="w-16 retro-box-inset bg-white px-2 py-1"
                      />
                      <Button type="submit">Weight</Button>
                    </form>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <form action={addItem} className="mt-4 flex gap-2">
              <input type="hidden" name="tripId" value={trip.id} />
              <input name="label" maxLength={80} placeholder="Add an item" className="flex-1 retro-box-inset bg-white px-3 py-2" />
              <Button type="submit">Add</Button>
            </form>
          ) : null}
        </Window>

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
