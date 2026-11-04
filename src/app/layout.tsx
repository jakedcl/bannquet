import { Suspense } from 'react';
import { TabBar } from '@/components/hub/TabBar';
import { TopBar } from '@/components/hub/TopBar';
import { HomeScreenTip } from '@/components/ui/HomeScreenTip';
import { LoadEntrance } from '@/components/ui/LoadEntrance';
import { RouteMotion } from '@/components/ui/RouteMotion';
import { getViewer } from '@/app/sign-in/actions';
import { countPendingMembers } from '@/lib/auth/members';
import { APPROVAL_WAIT } from '@/lib/membership';
import './globals.css';
import Providers from './providers';

export const dynamic = 'force-dynamic';

export const metadata = {
  metadataBase: new URL('https://www.bannquet.com'),
  title: 'Bannquet',
  description: 'Mountain weather, a trail map, fishing conditions, and a hiking crew’s peaks, trips and photos for the Northeast',
  appleWebApp: {
    capable: true,
    title: 'BANNQUET',
    statusBarStyle: 'default',
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9fb' },
    { media: '(prefers-color-scheme: dark)', color: '#161618' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const pendingCount = viewer?.role === 'admin' ? await countPendingMembers() : 0;
  const account = viewer
    ? {
        handle: viewer.handle,
        displayName: viewer.displayName,
        role: viewer.role,
        pendingCount,
      }
    : null;

  const pending = viewer?.role === 'pending';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={pending ? 'has-pending' : undefined}>
        <Providers account={account}>
          <div className="min-h-screen flex flex-col">
            <TopBar account={account} />
            <HomeScreenTip show={Boolean(viewer && !viewer.homeScreenTipSeenAt)} />
            {pending ? (
              <p className="pending-banner hub-bar ui-glass rounded-2xl px-4 py-2 text-center text-[0.9375rem] font-semibold shadow-[var(--ui-shadow)]">
                {APPROVAL_WAIT}
              </p>
            ) : null}
            <Suspense fallback={null}>
              <RouteMotion />
            </Suspense>
            <LoadEntrance />
            <main className="route-stage flex-1 bg-gray-50 pb-[var(--tab-h)]">
              {children}
            </main>
            <TabBar account={account} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
