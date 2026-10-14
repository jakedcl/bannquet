import { Fraunces, Source_Sans_3 } from 'next/font/google';
import Header from '@/components/ui/Header';
import { getViewer } from '@/app/sign-in/actions';
import { countPendingMembers } from '@/lib/auth/members';
import { APPROVAL_WAIT } from '@/lib/membership';
import './globals.css';
import Providers from './providers';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bannquet',
  description: 'Regional mountain weather, a map, and posts',
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
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable}`}>
      <body className={pending ? 'has-pending' : undefined}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header account={account} />
            {pending ? <p className="pending-banner">{APPROVAL_WAIT}</p> : null}
            <main className="flex-1 bg-background">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
