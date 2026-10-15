import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PinForm } from '@/components/pins/PinForm';
import { PhotoUpload, RouteUpload } from '@/components/posts/ProfileAdds';
import { PostForm } from '@/components/posts/PostForm';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const KINDS = [
  { id: 'post', label: 'Post' },
  { id: 'route', label: 'Route (GPX)' },
  { id: 'pin', label: 'Pin' },
  { id: 'photo', label: 'Photo' },
] as const;

type UploadKind = (typeof KINDS)[number]['id'];

function isKind(value: string | undefined): value is UploadKind {
  return KINDS.some((item) => item.id === value);
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  const params = await searchParams;
  const kind = isKind(params.kind) ? params.kind : null;

  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="Upload">
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  const friends = kind === 'post'
    ? (await listMembers())
      .filter((member) => member.id !== viewer.id && canContribute(member.role))
      .map((member) => ({
        id: member.id,
        label: member.displayName || member.handle || member.email || 'Friend',
      }))
    : [];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Window title="Upload">
          <p className="mb-4 text-sm text-gray-700">
            Add a post, a route, a pin, or a photo. They show on the map and on your page.
          </p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((item) => (
              <Button key={item.id} href={`/upload?kind=${item.id}`} tone={kind === item.id ? 'yellow' : 'default'}>
                {item.label}
              </Button>
            ))}
          </div>
        </Window>
        {kind === 'post' ? (
          <Window title="Post">
            <p className="mb-4 text-sm text-gray-700">
              Pick Trip report or General. A trip report can include the day, photos, and a route.
              A general post is a note and an optional photo.
            </p>
            <PostForm friends={friends} />
          </Window>
        ) : null}
        {kind === 'route' ? (
          <Window title="Route (GPX)">
            <p className="mb-4 text-sm text-gray-700">
              A route added here is the same thing as one inside a post. Both show on the map.
            </p>
            <RouteUpload />
          </Window>
        ) : null}
        {kind === 'pin' ? (
          <Window title="Pin">
            <p className="mb-4 text-sm text-gray-700">
              Drop a spot on the map. Give it a title, what you were doing, and a note. Photos are optional.
            </p>
            <PinForm />
          </Window>
        ) : null}
        {kind === 'photo' ? (
          <Window title="Photo">
            <p className="mb-4 text-sm text-gray-700">
              Photos land on the map at the spot they were taken, or where you drop them.
            </p>
            <PhotoUpload />
          </Window>
        ) : null}
      </div>
    </PageWrapper>
  );
}
