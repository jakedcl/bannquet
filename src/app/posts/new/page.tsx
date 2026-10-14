import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PostForm } from '@/components/posts/PostForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');

  const friends = (await listMembers())
    .filter((member) => member.id !== viewer.id)
    .map((member) => ({
      id: member.id,
      label: member.displayName || member.handle || member.email || 'Friend',
    }));

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="New post">
          <p className="mb-4 text-sm text-gray-700">
            Title, the day, what you were doing, who came, and the story. Photos and a GPX file are optional.
            Anything you add here shows on the map and in the posts.
          </p>
          <PostForm friends={friends} />
        </Window>
      </div>
    </PageWrapper>
  );
}
