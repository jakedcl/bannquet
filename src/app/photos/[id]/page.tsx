import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { SeeMore } from '@/components/library/AttachReport';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Window } from '@/components/retro/Window';
import { CrumbLeaf } from '@/components/ui/BackBar';
import { deletePhotoAction } from '@/app/library/actions';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { loadPhoto } from '@/lib/library';
import { canContribute, canDeleteOwned } from '@/lib/membership';
import { loadMapData } from '@/lib/posts';
import { listTripChoices, tripsForItem } from '@/lib/trips';
import { loadFailed } from '@/lib/load-error';

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
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Window title="Photo">
            <p className="text-sm font-bold">Postgres is not connected, so this photo cannot be loaded.</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  let photo: Awaited<ReturnType<typeof loadPhoto>> = null;
  let error: string | null = null;
  try {
    photo = await loadPhoto(id);
  } catch (err) {
    error = loadFailed('photo page', err, 'That photo did not load. Try again in a minute.');
  }
  if (error) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Window title="Photo">
            <p className="text-sm font-bold">{error}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }
  if (!photo) notFound();

  const viewer = await getViewer();
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: photo.userId,
  }));
  const [tripChoices, attachedTrips] = viewer && manage
    ? await Promise.all([
      listTripChoices().catch(() => []),
      tripsForItem('photo', photo.id).catch(() => []),
    ])
    : [[], []];
  const map = photo.lat != null && photo.lng != null ? await loadMapData().catch(() => null) : null;

  return (
    <PageWrapper>
      <CrumbLeaf label={photo.caption || 'Photo'} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={photo.caption || 'Photo'}>
          <Image
            src={photo.url}
            alt={photo.caption || ''}
            width={1200}
            height={800}
            unoptimized
            sizes="(max-width: 768px) 100vw, 48rem"
            className="h-auto w-full bg-white object-contain retro-box"
          />
          <p className="mt-3 text-sm">
            {photo.handle ? <Link href={`/user/${photo.handle}`} className="underline">{photo.who}</Link> : photo.who}
          </p>
          {photo.pinId ? (
            <p className="mt-2 text-sm">
              <Link href={`/pins/${photo.pinId}`} className="underline">On a pin</Link>
            </p>
          ) : null}
          <div className="mt-3">
            <SeeMore post={photo.post} />
          </div>
        </Window>
        {map && photo.lat != null && photo.lng != null ? (
          <div className="h-80 min-h-[420px] overflow-hidden bg-white retro-box">
            <MapCanvas points={map.points} lines={map.lines} focus={{ lng: photo.lng, lat: photo.lat, zoom: 12 }} />
          </div>
        ) : null}
        {manage && viewer ? (
          <Window title="This photo">
            <div>
              <ConfirmDelete
                action={deletePhotoAction}
                confirm="Delete this photo?"
                fields={{ id: photo.id, returnTo: viewer.handle ? `/user/${viewer.handle}` : '/' }}
              />
            </div>
          </Window>
        ) : null}
        {viewer && canContribute(viewer.role) && viewer.id === photo.userId ? (
          <AddToTrip
            kind="photo"
            entityId={photo.id}
            trips={tripChoices}
            attached={attachedTrips}
            startOpen={addTrip === '1'}
          />
        ) : null}
      </div>
    </PageWrapper>
  );
}
