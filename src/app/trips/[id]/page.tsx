import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Window } from '@/components/retro/Window';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { deleteTripAction, detachFromTripAction, toggleGoing, updateTripAction } from '@/app/trips/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { LinkedText } from '@/components/ui/LinkedText';
import { draftPhotoSources, SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { canContribute, canDeleteOwned, canEditOwned } from '@/lib/membership';
import { getTrip } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id) || !isDatabaseConfigured()) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  const viewer = await getViewer();
  const canRsvp = !viewer || canContribute(viewer.role);
  const canDeleteTrip = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: trip.createdBy,
  }));
  const canEditTrip = Boolean(viewer && canEditOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: trip.createdBy,
  }));
  const canRemove = (ownerId: string | null | undefined) => Boolean(viewer && canEditOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: ownerId ?? null,
  }));
  const going = Boolean(viewer && trip.people.some((person) => person.id === viewer.id));

  return (
    <PageWrapper leaf={trip.title}>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={trip.title}>
          <p className="text-sm">
            {formatTripDate(trip.tripDate, 'long')}
            {` · ${trip.upcoming ? 'Upcoming' : 'Past'}`}
          </p>
          {trip.notes ? <div className="mt-3"><LinkedText text={trip.notes} /></div> : null}
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
                <SubmitButton tone={going ? 'default' : 'yellow'} pendingLabel={going ? 'Leaving…' : 'Saving…'}>{going ? "I'm out" : "I'm in"}</SubmitButton>
              </form>
            ) : null}
          </div>
          {canEditTrip ? (
            <EditDetails>
              <EditForm
                key={`${trip.title}\n${trip.tripDate ?? ''}\n${trip.notes}`}
                action={updateTripAction}
                hidden={{ id: trip.id }}
                fields={[
                  { name: 'title', label: 'Name', value: trip.title, maxLength: 80 },
                  { name: 'tripDate', label: 'Date', value: trip.tripDate ?? '', kind: 'date' },
                  { name: 'notes', label: 'Notes', value: trip.notes, kind: 'textarea', maxLength: 4000 },
                ]}
              />
            </EditDetails>
          ) : null}
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

        <Window title="Attached">
          {trip.attachments.length === 0 ? <p className="text-sm">No pins, routes, or photos yet.</p> : (
            <ul className="space-y-2 text-sm">
              {trip.attachments.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2">
                  {(() => {
                    const photo = draftPhotoSources(item);
                    if (!photo) return null;
                    return (
                      <SmallPhotoImage
                        url={photo.url}
                        thumbUrl={photo.thumbUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-cover"
                      />
                    );
                  })()}
                  <Link href={item.href} className="min-w-0 flex-1 truncate font-bold underline">{item.label}</Link>
                  <span className="text-xs uppercase text-gray-600">{item.kind}</span>
                  {canRemove(item.ownerId) ? (
                    <ConfirmDelete
                      action={detachFromTripAction}
                      confirm="Remove this from the trip?"
                      label={`Remove ${item.label} from this trip`}
                      fields={{ tripId: trip.id, kind: item.kind, entityId: item.id, returnTo: `/trips/${trip.id}` }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
