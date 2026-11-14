import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/hub/Button';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { viewerCanContribute } from '@/lib/membership';
import { listPosts, type PostSummary } from '@/lib/feed-posts';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { APPROVAL_WAIT } from '@/lib/membership';

export const dynamic = 'force-dynamic';

function formatWhen(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function byline(post: PostSummary): string {
  const when = formatWhen(post.createdAt);
  const who = post.authorHandle ? `@${post.authorHandle}` : post.authorName ?? '';
  if (who && when) return `${who} · ${when}`;
  return who || when;
}

export default async function PostsPage() {
  const viewer = await getViewer();
  let posts: PostSummary[] = [];
  let error: string | null = null;
  if (!isDatabaseConfigured()) {
    error = 'Postgres is not connected, so posts cannot load.';
  } else {
    try {
      posts = await listPosts();
    } catch (err) {
      error = loadFailed('posts list', err, 'Posts did not load. Try again in a minute.');
    }
  }
  const canAdd = viewerCanContribute(viewer);
  const waiting = viewer && !canAdd;

  return (
    <PageWrapper>
      <HubPage title="Posts" width="3xl" trailing={canAdd ? <Button href="/upload?kind=post" tone="yellow">+ New post</Button> : null}>
        {waiting ? <p className="t-body font-bold">{APPROVAL_WAIT}</p> : null}
        {!viewer ? <p className="t-body"><Link href="/sign-in" className="underline">Sign in</Link> to read member posts.</p> : null}
        {error ? <p className="t-body font-bold">{error}</p> : posts.length === 0 ? <p className="t-body">No posts yet.</p> : (
          <Card padded={false}>
            <ListGroup bare>
              {posts.map((post) => (
                <ListRow key={post.id} href={`/posts/${post.id}`} title={post.title} subtitle={byline(post)} />
              ))}
            </ListGroup>
          </Card>
        )}
      </HubPage>
    </PageWrapper>
  );
}
