import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { AttachReport, SeeMore } from '@/components/library/AttachReport';
import { Window } from '@/components/retro/Window';
import { deletePhotoAction } from '@/app/library/actions';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { loadPhoto } from '@/lib/library';
import { canDeleteOwned } from '@/lib/membership';
import { loadMapData } from '@/lib/posts';
import { listAuthorPosts } from '@/lib/trips';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    error = err instanceof Error ? err.message : 'That photo did not load.';
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
  const reports = viewer && manage ? await listAuthorPosts(viewer.id).catch(() => []) : [];
  const map = photo.lat != null && photo.lng != null ? await loadMapData().catch(() => null) : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={photo.caption || 'Photo'}>
          <Image
            src={photo.url}
            alt={photo.caption || ''}
            width={1200}
            height={800}
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
            <AttachReport
              kind="photo"
              entityId={photo.id}
              reports={reports.map((item) => ({ id: item.id, title: item.title }))}
              attached={Boolean(photo.post)}
              returnTo={`/photos/${photo.id}`}
            />
            <div className="mt-4">
              <ConfirmDelete
                action={deletePhotoAction}
                label="Delete"
                confirm="Delete this photo?"
                fields={{ id: photo.id, returnTo: viewer.handle ? `/user/${viewer.handle}` : '/' }}
              />
            </div>
          </Window>
        ) : null}
      </div>
    </PageWrapper>
  );
}
