import type { ReactNode } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import TripCard from '@/components/trip-reports/TripCard';
import { Button, StatusBar, Window } from '@/components/retro';
import { isDatabaseConfigured } from '@/db';
import { listTripReports } from '@/lib/trip-reports';

export const dynamic = 'force-dynamic';

export default async function PostsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper className="bg-gray-50">
        <FeedShell>
          <Window title="Posts">
            <p className="text-gray-700">Posts show up here after the database is connected. Weather still works without it.</p>
          </Window>
        </FeedShell>
      </PageWrapper>
    );
  }

  let posts: Awaited<ReturnType<typeof listTripReports>> | null = null;
  let failed = false;
  try {
    posts = await listTripReports();
  } catch {
    failed = true;
  }

  if (failed || !posts) {
    return (
      <PageWrapper className="bg-gray-50">
        <FeedShell>
          <Window title="Error">
            <p className="mb-4 text-red-800">Posts did not load.</p>
            <Button tone="orange" href="/posts">Try again</Button>
          </Window>
        </FeedShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-gray-50">
      <FeedShell count={posts.length}>
        {posts.length === 0 ? (
          <Window title="Empty">
            <p className="text-gray-700">No posts yet. When someone writes one, it lands here and on the map.</p>
          </Window>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <TripCard key={post.id} trip={post} index={index} />
            ))}
          </div>
        )}
      </FeedShell>
    </PageWrapper>
  );
}

function FeedShell({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green/70">posts</p>
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Posts</h1>
          <p className="max-w-2xl text-gray-600">
            Stories, photos, and routes from the group. Each one also shows on the map.
          </p>
        </div>
        <div className="flex gap-3">
          <Button tone="green" href="/upload?kind=post">Write a post</Button>
          <Button tone="blue" href="/map">Map</Button>
        </div>
      </div>
      {children}
      {typeof count === 'number' ? (
        <div className="mt-8">
          <StatusBar>{count} {count === 1 ? 'post' : 'posts'}</StatusBar>
        </div>
      ) : null}
    </div>
  );
}
