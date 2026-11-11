import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { deletePostAction, updatePostAction } from '@/app/posts/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { LinkedText } from '@/components/ui/LinkedText';
import { Card } from '@/components/hub/Card';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { adminPowerActing, adminPowerLabel } from '@/lib/admin-ui';
import { canDeleteOwned, canEditOwned, viewerCanContribute } from '@/lib/membership';
import { getPost } from '@/lib/feed-posts';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { APPROVAL_WAIT } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <Card title="Post">
          <p className="text-sm font-bold">Postgres is not connected, so this post cannot be loaded.</p>
        </Card>
      </PageWrapper>
    );
  }
  let post: Awaited<ReturnType<typeof getPost>> = null;
  let loadError: string | null = null;
  try {
    post = await getPost(id);
  } catch (err) {
    loadError = loadFailed('post', err, 'That post did not load. Try again in a minute.');
  }
  if (loadError) {
    return (
      <PageWrapper>
        <Card title="Post">
          <p className="text-sm font-bold">{loadError}</p>
        </Card>
      </PageWrapper>
    );
  }
  if (!post) notFound();

  const viewer = await getViewer();
  const canRead = Boolean(viewer);
  const canEditPost = Boolean(viewer && canEditOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: post.authorId,
  }));
  const canDeletePost = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: post.authorId,
  }));
  const deletePostAdminPower = Boolean(viewer && adminPowerActing({
    role: viewer.role,
    actorId: viewer.id,
    ownerId: post.authorId,
  }));
  const authorHref = post.authorHandle ? `/user/${post.authorHandle}` : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <LargeTitle title={post.title} />
        <p className="text-sm text-gray-700">
          {authorHref ? <Link href={authorHref} className="font-bold underline">{post.authorName}</Link> : post.authorName}
          {' · '}
          {formatWhen(post.createdAt)}
          {post.updatedAt !== post.createdAt ? ` · edited ${formatWhen(post.updatedAt)}` : ''}
        </p>
        {!canRead ? (
          <Card>
            <p className="text-sm font-bold"><Link href="/sign-in" className="underline">Sign in</Link> to read this post.</p>
          </Card>
        ) : viewer && !viewerCanContribute(viewer) ? (
          <Card>
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          </Card>
        ) : (
          <Card>
            <div className="whitespace-pre-wrap text-sm">
              <LinkedText text={post.body} />
            </div>
            {canEditPost ? (
              <EditDetails adminPower={deletePostAdminPower}>
                <EditForm
                  action={updatePostAction}
                  hidden={{ id }}
                  adminPower={deletePostAdminPower}
                  fields={[
                    { name: 'title', label: 'Title', value: post.title, maxLength: 120 },
                    { name: 'body', label: 'Body', value: post.body, kind: 'textarea', maxLength: 8000 },
                  ]}
                />
              </EditDetails>
            ) : null}
            {canDeletePost ? (
              <div className="mt-4">
                <ConfirmDelete
                  action={deletePostAction}
                  confirm="Delete this post?"
                  adminPower={deletePostAdminPower}
                  label={deletePostAdminPower ? adminPowerLabel('Delete post').ariaLabel : undefined}
                  fields={{ id }}
                />
              </div>
            ) : null}
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
