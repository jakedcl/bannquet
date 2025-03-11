import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.weather.gov',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
