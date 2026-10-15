import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bannquet',
    short_name: 'Bannquet',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e4d2b',
    theme_color: '#1e4d2b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
