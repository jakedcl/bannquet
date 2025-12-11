import '@/styles/globals.css';
import Header from '@/components/ui/Header';
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Bannquet',
  description: 'Mountain weather and 3D models',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
