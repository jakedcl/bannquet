import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { deleteTripAction, detachFromTripAction, toggleGoing, updateTripAction } from '@/app/trips/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { LinkedText } from '@/components/ui/LinkedText';
import { draftPhotoSources, SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { Card } from '@/components/hub/Card';
import { hubButtonClass, Pill } from '@/components/hub/Button';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { canDeleteOwned, canEditOwned, viewerCanContribute } from '@/lib/membership';
import { getTrip, type TripAttachment } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KIND_LABEL: Record<TripAttachment['kind'], string> = { pin: 'Pin', route: 'Route', photo: 'Photo' };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="avatar-frame flex h-8 w-8 items-center justify-center text-xs font-bold text-brand-green">
      {initials(name)}
    </span>
  );
}

function KindGlyph({ kind }: { kind: TripAttachment['kind'] }) {
  const path = kind === 'route'
    ? 'M5 18c3-1 3-5 6-6s4 2 7-1'
    : kind === 'pin'
      ? 'M12 20s-5.5-5-5.5-9a5.5 5.5 0 1111 0c0 4-5.5 9-5.5 9z'
      : 'M4 7h3l1.5-2h7L17 7h3v11H4zM12 15.5a3 3 0 100-6 3 3 0 000 6z';
  return (
    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center border border-ui-separator bg-ui-surface-2 text-ui-label-2">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id) || !isDatabaseConfigured()) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  const viewer = await getViewer();
  const canRsvp = viewerCanContribute(viewer);
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
  const canRemove = (ownerId: string | null | undefined) => Boolean(viewer && (
    canEditOwned({
      actorRole: viewer.role,
      actorId: viewer.id,
      ownerId: trip.createdBy,
    })
    || canEditOwned({
      actorRole: viewer.role,
      actorId: viewer.id,
      ownerId: ownerId ?? null,
    })
  ));
  const going = Boolean(viewer && trip.people.some((person) => person.id === viewer.id));
  const activity = trip.activity && isActivity(trip.activity) ? ACTIVITY_META[trip.activity].label : null;

  return (
    <PageWrapper leaf={trip.title} className="hub">
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <div className="space-y-3">
          <LargeTitle
            title={trip.title}
            subtitle={formatTripDate(trip.tripDate, 'long')}
          />
          <div className="flex flex-wrap gap-2">
            <Pill tone={trip.upcoming ? 'accent' : 'gray'}>{trip.upcoming ? 'Upcoming' : 'Past'}</Pill>
            {activity ? <Pill>{activity}</Pill> : null}
            <Pill>{trip.people.length === 1 ? '1 going' : `${trip.people.length} going`}</Pill>
          </div>
          {canRsvp ? (
            <form action={toggleGoing}>
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="going" value={going ? '0' : '1'} />
              <SubmitButton
                unstyled
                pendingLabel={going ? 'Leaving…' : 'Saving…'}
                className={hubButtonClass(going ? 'gray' : 'filled', 'md', 'w-full sm:w-auto sm:min-w-40')}
              >
                {going ? "I'm out" : "I'm in"}
              </SubmitButton>
            </form>
          ) : null}
        </div>

        {trip.notes ? (
          <Card title="Notes">
            <LinkedText text={trip.notes} className="t-body text-ui-label [&_a]:font-bold [&_a]:text-brand-green" />
          </Card>
        ) : null}

        <Card title="Who's going" padded={false}>
          {trip.people.length === 0 ? (
            <p className="t-subhead p-3 text-ui-label-2 sm:p-4">Nobody yet.</p>
          ) : (
            <ListGroup bare>
              {trip.people.map((person) => (
                <ListRow
                  key={person.id}
                  href={person.handle ? `/user/${person.handle}` : undefined}
                  leading={<Avatar name={person.name} />}
                  title={person.name}
                  subtitle={person.handle ? `@${person.handle}` : null}
                />
              ))}
            </ListGroup>
          )}
        </Card>

        <Card title="Attached" padded={false}>
          {trip.attachments.length === 0 ? (
            <p className="t-subhead p-3 text-ui-label-2 sm:p-4">No pins, routes, or photos yet.</p>
          ) : (
            <ListGroup bare>
              {trip.attachments.map((item) => {
                const photo = draftPhotoSources(item);
                return (
                  <ListRow
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    leading={photo ? (
                      <SmallPhotoImage
                        url={photo.url}
                        thumbUrl={photo.thumbUrl}
                        alt={item.label}
                        width={40}
                        height={40}
                        className="h-10 w-10 border border-ui-separator object-cover"
                      />
                    ) : <KindGlyph kind={item.kind} />}
                    title={item.label}
                    subtitle={KIND_LABEL[item.kind]}
                    accessory={canRemove(item.ownerId) ? (
                      <ConfirmDelete
                        look="hub"
                        action={detachFromTripAction}
                        confirm="Remove this from the trip?"
                        label={`Remove ${item.label} from this trip`}
                        fields={{ tripId: trip.id, kind: item.kind, entityId: item.id, returnTo: `/trips/${trip.id}` }}
                      />
                    ) : null}
                  />
                );
              })}
            </ListGroup>
          )}
        </Card>

        {canEditTrip || canDeleteTrip ? (
          <section className="space-y-2" aria-label="Manage trip">
            {canEditTrip ? (
              <EditDetails look="hub">
                <Card>
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
                </Card>
              </EditDetails>
            ) : null}
            {canDeleteTrip ? (
              <ConfirmDelete
                look="hub"
                text="Delete trip"
                action={deleteTripAction}
                confirm="Delete this trip?"
                fields={{ id: trip.id }}
              />
            ) : null}
          </section>
        ) : null}
      </div>
    </PageWrapper>
  );
}
