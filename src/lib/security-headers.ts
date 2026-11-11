/** Site-wide lock, kept for every page except Peak Finder. */
export const SITE_PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(self)';

/** Peak Finder is the only page allowed to use the camera and motion sensors. */
export const PEAK_FINDER_PERMISSIONS_POLICY =
  'camera=(self), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)';

const BASE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
] as const;

export type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

/**
 * `/peak-finder` is listed on its own so it does not also receive `camera=()`.
 * Two Permissions-Policy headers are combined by intersection, and `camera=()`
 * would win. The other pattern is every path except that exact page.
 */
export function securityHeaderRules(): HeaderRule[] {
  return [
    {
      source: '/sw-peak-finder.js',
      headers: [
        ...BASE_HEADERS,
        { key: 'Permissions-Policy', value: SITE_PERMISSIONS_POLICY },
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    {
      source: '/peak-finder',
      headers: [...BASE_HEADERS, { key: 'Permissions-Policy', value: PEAK_FINDER_PERMISSIONS_POLICY }],
    },
    {
      source: '/((?!peak-finder$).*)',
      headers: [...BASE_HEADERS, { key: 'Permissions-Policy', value: SITE_PERMISSIONS_POLICY }],
    },
  ];
}

export function permissionsPolicyFor(pathname: string): string {
  return pathname === '/peak-finder' ? PEAK_FINDER_PERMISSIONS_POLICY : SITE_PERMISSIONS_POLICY;
}
