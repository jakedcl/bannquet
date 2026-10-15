import Header from '@/components/ui/Header';
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
    title: 'BANNQUET',
  },
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
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header account={account} />
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
