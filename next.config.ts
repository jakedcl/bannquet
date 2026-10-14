import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.weather.gov",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
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
    ];
  },
};

export default nextConfig;
