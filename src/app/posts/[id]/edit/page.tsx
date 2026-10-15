import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { PostForm } from '@/components/posts/PostForm';
import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { isDatabaseConfigured } from '@/db';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { getEditablePost } from '@/lib/trip-reports';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');

  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="Edit post">
            <p className="text-sm text-gray-700">Postgres is not connected, so this post cannot be edited.</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="Edit post">
            <p className="text-sm text-gray-700">{APPROVAL_WAIT}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  const post = await getEditablePost(id);
  if (!post || post.authorId !== viewer.id) notFound();

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="Edit post">
          <p className="mb-4 text-sm text-gray-700">
            Change the type, title, or note. Switching to General hides the route fields and keeps the old day and activity.
          </p>
          <PostForm friends={[]} initial={post} />
        </Window>
      </div>
    </PageWrapper>
  );
}
