import Image from 'next/image';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Card } from '@/components/hub/Card';
import { PhotoTags } from '@/components/photos/PhotoTags';
import { deletePhotoAction, updatePhotoCaptionAction } from '@/app/library/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { loadPhoto } from '@/lib/library';
import { canEditOwned } from '@/lib/membership';
import { loadMapDataNear } from '@/lib/posts';
import { adminPowerActing } from '@/lib/admin-ui';
import { listTripChoices, tripAttachHintForViewer, tripsForItem } from '@/lib/trips';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PhotoPage({
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
        <HubPage title="Photo" width="3xl">
          <Card>
            <p className="text-sm font-bold">Postgres is not connected, so this photo cannot be loaded.</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }

  const viewer = await getViewer();
  let photo: Awaited<ReturnType<typeof loadPhoto>> = null;
  let error: string | null = null;
  try {
    photo = await loadPhoto(id, viewer?.id ?? null);
  } catch (err) {
    error = loadFailed('photo page', err, 'That photo did not load. Try again in a minute.');
  }
  if (error) {
    return (
      <PageWrapper>
        <HubPage title="Photo" width="3xl">
          <Card>
            <p className="text-sm font-bold">{error}</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }
  if (!photo) notFound();

  const manage = Boolean(viewer && canEditOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: photo.userId,
  }));
  const [tripChoices, attachedTrips, attachBlocked] = viewer && manage
    ? await Promise.all([
      listTripChoices().catch(() => []),
      tripsForItem('photo', photo.id).catch(() => []),
      tripAttachHintForViewer(viewer).catch(() => null),
    ])
    : [[], [], null];
  const deleteAdminPower = Boolean(viewer && adminPowerActing({
    role: viewer.role,
    actorId: viewer.id,
    ownerId: photo.userId,
  }));
  const map = photo.lat != null && photo.lng != null ? await loadMapDataNear(viewer?.id ?? null, { lng: photo.lng, lat: photo.lat }).catch(() => null) : null;

  return (
    <PageWrapper leaf={photo.caption || 'Photo'}>
      <HubPage title={photo.caption || 'Photo'} width="3xl">
        <Card>
          <Image
            src={photo.url}
            alt={photo.caption || ''}
            width={1200}
            height={800}
            unoptimized
            sizes="(max-width: 768px) 100vw, 48rem"
            className="h-auto w-full bg-white object-contain retro-box"
          />
          <PhotoTags photo={photo} />
          {manage ? (
            <EditDetails>
              <EditForm
                key={photo.caption ?? ''}
                action={updatePhotoCaptionAction}
                hidden={{ id: photo.id }}
                fields={[{ name: 'caption', label: 'Caption', value: photo.caption ?? '', maxLength: 200 }]}
              />
            </EditDetails>
          ) : null}
        </Card>
        {map && photo.lat != null && photo.lng != null ? (
          <div className="h-80 min-h-[420px] overflow-hidden bg-white retro-box">
            <MapCanvas points={map.points} lines={map.lines} focus={{ lng: photo.lng, lat: photo.lat, zoom: 12 }} />
          </div>
        ) : null}
        {manage && viewer ? (
          <Card title="Manage">
            <div>
              <ConfirmDelete
                action={deletePhotoAction}
                confirm="Delete this photo?"
                adminPower={deleteAdminPower}
                fields={{ id: photo.id, returnTo: viewer.handle ? `/user/${viewer.handle}` : '/' }}
              />
            </div>
          </Card>
        ) : null}
        {manage ? (
          <AddToTrip
            kind="photo"
            entityId={photo.id}
            trips={tripChoices}
            attached={attachedTrips}
            startOpen={addTrip === '1'}
            attachBlocked={attachBlocked}
          />
        ) : null}
      </HubPage>
    </PageWrapper>
  );
}
