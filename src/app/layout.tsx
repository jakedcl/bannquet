import Header from '@/components/ui/Header';
import { getViewer } from '@/app/sign-in/actions';
import './globals.css';
import Providers from './providers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bannquet',
  description: 'Mountain weather dashboard and trip reports for the northeastern United States',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const account = viewer
    ? {
        handle: viewer.handle,
        displayName: viewer.displayName,
        role: viewer.role,
      }
    : null;

  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header account={account} />
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
