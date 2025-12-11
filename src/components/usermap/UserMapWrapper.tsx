'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false for Mapbox compatibility
const UserMapClient = dynamic(
  () => import('./UserMapClient'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-72px)] w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green mb-4"></div>
          <p className="text-gray-600">Loading visitor map...</p>
        </div>
      </div>
    ),
  }
);

export default function UserMapWrapper() {
  return <UserMapClient />;
}
