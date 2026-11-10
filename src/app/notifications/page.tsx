import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { getViewer } from '@/app/sign-in/actions';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { listNotifications, markNotificationsRead } from '@/lib/notifications';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
          <Card title="Notifications">
            <p className="text-sm font-bold">Postgres is not connected, so notifications cannot load.</p>
          </Card>
        </div>
      </PageWrapper>
    );
  }
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in?next=/notifications');

  let items: Awaited<ReturnType<typeof listNotifications>> = [];
  let loadError: string | null = null;
  try {
    items = await listNotifications(viewer.id);
    await markNotificationsRead(viewer.id);
  } catch (err) {
    loadError = loadFailed('notifications', err, 'Notifications did not load. Try again in a minute.');
  }

  return (
    <PageWrapper leaf="Notifications" className="hub">
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <LargeTitle title="Notifications" subtitle="Trip updates and requests" />
        {loadError ? (
          <Card title="Notifications">
            <p className="text-sm font-bold">{loadError}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card title="All caught up">
            <p className="text-sm font-bold text-gray-800">No notifications yet.</p>
          </Card>
        ) : (
          <Card padded={false}>
            <ListGroup bare>
              {items.map((item) => (
                <ListRow
                  key={item.id}
                  href={item.href ?? undefined}
                  title={item.title}
                  subtitle={item.body}
                  trailing={item.href ? <span className="text-xs font-bold uppercase text-brand-green">Open</span> : null}
                />
              ))}
            </ListGroup>
          </Card>
        )}
        <p className="text-center text-sm">
          <Link href="/trips" className="font-bold underline">Back to trips</Link>
        </p>
      </div>
    </PageWrapper>
  );
}
