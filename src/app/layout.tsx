import Header from '@/components/ui/Header';
import { HomeScreenTip } from '@/components/ui/HomeScreenTip';
import { getViewer } from '@/app/sign-in/actions';
import { countPendingMembers } from '@/lib/auth/members';
import { APPROVAL_WAIT } from '@/lib/membership';
import './globals.css';
import Providers from './providers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bannquet',
  description: 'Regional mountain weather, a map, and posts',
  appleWebApp: {
    capable: true,
    title: 'BANNQUET',
    statusBarStyle: 'black',
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: '#1e4d2b',
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
    <html lang="en">
      <body className={pending ? 'has-pending' : undefined}>
        <Providers account={account}>
          <div className="min-h-screen flex flex-col">
            <Header account={account} />
            <HomeScreenTip show={Boolean(viewer && !viewer.homeScreenTipSeenAt)} />
            {pending ? (
              <p className="pending-banner retro-box bg-beige px-4 py-2 text-center text-sm font-bold text-gray-900">
                {APPROVAL_WAIT}
              </p>
            ) : null}
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
