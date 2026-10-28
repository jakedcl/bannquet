import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { PhotoGrid } from '@/components/profile/ProfileLists';
import { PhotoMemberFilter } from '@/components/photos/PhotoMemberFilter';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { cleanHandle, listGalleryPhotos, listPhotoMembers, parseCursor, type GalleryPhoto } from '@/lib/gallery';
import { canContribute } from '@/lib/membership';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; before?: string }>;
}) {
  const params = await searchParams;
  const who = cleanHandle(params.who);
  const before = parseCursor(params.before);
  const viewer = await getViewer();
  let photos: GalleryPhoto[] = [];
  let next: string | null = null;
  let members: Array<{ handle: string; name: string }> = [];
  let error: string | null = null;
  if (!isDatabaseConfigured()) {
    error = 'Postgres is not connected, so photos cannot load.';
  } else {
    try {
      const [page, people] = await Promise.all([listGalleryPhotos({ handle: who, before }), listPhotoMembers()]);
      photos = page.photos;
      next = page.next;
      members = people;
    } catch (err) {
      error = loadFailed('photo gallery', err, 'Photos did not load. Try again in a minute.');
    }
  }
  const canAdd = !viewer || canContribute(viewer.role);
  const query = (extra: Record<string, string>) => {
    const search = new URLSearchParams({ ...(who ? { who } : {}), ...extra }).toString();
    return search ? `/photos?${search}` : '/photos';
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Window title="Photos" action={canAdd ? <Button href="/upload?kind=photo" tone="yellow">+ Add photos</Button> : null}>
          {error ? <p className="text-sm font-bold">{error}</p> : (
            <div className="space-y-4">
              {members.length > 1 ? <PhotoMemberFilter value={who ?? ''} members={members} /> : null}
              {photos.length === 0 ? <p className="text-sm">No photos yet.</p> : (
                <PhotoGrid photos={photos} manage={false} profilePath="/photos" wide />
              )}
              {before || next ? (
                <div className="flex flex-wrap gap-2">
                  {before ? <Button href={query({})}>Newest</Button> : null}
                  {next ? <Button href={query({ before: next })}>Older photos</Button> : null}
                </div>
              ) : null}
            </div>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
