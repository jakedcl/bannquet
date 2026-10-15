import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PostForm } from '@/components/posts/PostForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="New post">
            <p className="text-sm text-gray-700">{APPROVAL_WAIT}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  const friends = (await listMembers())
    .filter((member) => member.id !== viewer.id && canContribute(member.role))
    .map((member) => ({
      id: member.id,
      label: member.displayName || member.handle || member.email || 'Friend',
    }));

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="New post">
          <p className="mb-4 text-sm text-gray-700">
            Pick Trip report or General. A trip report can include the day, photos, and a route.
            A general post is a note and an optional photo.
          </p>
          <PostForm friends={friends} />
        </Window>
      </div>
    </PageWrapper>
  );
}
