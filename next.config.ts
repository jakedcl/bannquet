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
