import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['unpdf'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.weather.gov",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // Basic headers only. A full content policy would need to list every map,
  // tile and photo host, so it's left out; framing is blocked here instead.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/studio", destination: "/admin", permanent: false },
      { source: "/studio/:path*", destination: "/admin", permanent: false },
      { source: "/hikers/:username", destination: "/user/:username", permanent: false },
      { source: "/trip-reports/new", destination: "/posts/new", permanent: false },
      { source: "/trip-reports/submit", destination: "/posts", permanent: false },
      { source: "/trip-reports/edit", destination: "/posts", permanent: false },
      { source: "/trip-reports/:id", destination: "/posts/:id", permanent: false },
      { source: "/trip-reports", destination: "/posts", permanent: false },
    ];
  },
};

export default nextConfig;
