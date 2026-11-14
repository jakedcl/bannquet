import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { deletePostAction } from '@/app/posts/actions';
import { EditDetails } from '@/components/edit/EditForm';
import { EditPostForm } from '@/components/posts/EditPostForm';
import { draftPhotoSources, SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { listChatCatalog } from '@/lib/chat';
import type { PostAttachment } from '@/lib/post-attachments';
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

const KIND_LABEL: Record<PostAttachment['kind'], string> = { pin: 'Pin', route: 'Route', photo: 'Photo' };

function KindGlyph({ kind }: { kind: PostAttachment['kind'] }) {
  const path = kind === 'route'
    ? 'M5 18c3-1 3-5 6-6s4 2 7-1'
    : kind === 'pin'
      ? 'M12 20s-5.5-5-5.5-9a5.5 5.5 0 1111 0c0 4-5.5 9-5.5 9z'
      : 'M4 7h3l1.5-2h7L17 7h3v11H4zM12 15.5a3 3 0 100-6 3 3 0 000 6z';
  return (
    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center border border-[#5c3a1e] bg-white text-gray-700">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

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
  const catalog = canEditPost && isDatabaseConfigured()
    ? await listChatCatalog().catch(() => [])
    : [];

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
          <>
            <Card>
              <div className="whitespace-pre-wrap text-sm">
                <LinkedText text={post.body} />
              </div>
            </Card>
            {post.attachments.length > 0 ? (
              <Card title="Attached" padded={false}>
                <ListGroup bare>
                  {post.attachments.map((item) => {
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
                            className="h-10 w-10 border border-[#5c3a1e] object-cover"
                          />
                        ) : <KindGlyph kind={item.kind} />}
                        title={item.label}
                        subtitle={KIND_LABEL[item.kind]}
                      />
                    );
                  })}
                </ListGroup>
              </Card>
            ) : null}
            {canEditPost && viewer ? (
              <Card>
                <EditDetails adminPower={deletePostAdminPower}>
                  <EditPostForm
                    postId={id}
                    title={post.title}
                    body={post.body}
                    attachments={post.attachments}
                    viewerId={viewer.id}
                    catalog={catalog}
                    adminPower={deletePostAdminPower}
                  />
                </EditDetails>
              </Card>
            ) : null}
            {canDeletePost ? (
              <Card>
                <ConfirmDelete
                  action={deletePostAction}
                  confirm="Delete this post?"
                  adminPower={deletePostAdminPower}
                  label={deletePostAdminPower ? adminPowerLabel('Delete post').ariaLabel : undefined}
                  fields={{ id }}
                />
              </Card>
            ) : null}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
