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
      <PageWrapper>
        <FeedShell>
          <Window title="Trip reports">
            <p className="text-sm text-gray-700">Trip reports show up here after the database is connected. Weather still works without it.</p>
          </Window>
        </FeedShell>
      </PageWrapper>
    );
  }

  let posts: Awaited<ReturnType<typeof listTripReports>> | null = null;
  let failed = false;
  try {
    posts = await listTripReports({ postKind: 'trip_report' });
  } catch {
    failed = true;
  }

  if (failed || !posts) {
    return (
      <PageWrapper>
        <FeedShell>
          <Window title="Trip reports">
            <p className="mb-4 text-sm font-bold">Trip reports did not load.</p>
            <Button tone="orange" href="/posts">Try again</Button>
          </Window>
        </FeedShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <FeedShell count={posts.length}>
        {posts.length === 0 ? (
          <Window title="Empty">
            <p className="text-sm text-gray-700">No trip reports yet. Chat is the place for a quick note.</p>
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
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Trip reports</h1>
          <p className="max-w-2xl text-gray-600">
            Stories, photos, and routes from a day out. Quick notes go in chat.
          </p>
        </div>
        <Button tone="green" href="/upload?kind=post">Write a trip report</Button>
      </div>
      {children}
      {typeof count === 'number' ? (
        <div className="mt-8">
          <StatusBar>{count} {count === 1 ? 'trip report' : 'trip reports'}</StatusBar>
        </div>
      ) : null}
    </div>
  );
}
