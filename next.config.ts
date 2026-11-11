import type { NextConfig } from "next";
import { securityHeaderRules } from "./src/lib/security-headers";

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
    return securityHeaderRules();
  },
  async redirects() {
    return [
      { source: "/studio", destination: "/admin", permanent: false },
      { source: "/studio/:path*", destination: "/admin", permanent: false },
      { source: "/hikers/:username", destination: "/user/:username", permanent: false },
      { source: "/conditions", destination: "/mountain-weather/conditions", permanent: false },
      { source: "/routes", destination: "/map", permanent: false },
      { source: "/pins", destination: "/map", permanent: false },
      { source: "/weather", destination: "/mountain-weather", permanent: false },
      { source: "/weather/:path*", destination: "/mountain-weather", permanent: false },
      { source: "/trips/new", destination: "/upload?kind=post", permanent: false },
      { source: "/trips/:path*", destination: "/posts", permanent: false },
      { source: "/trips", destination: "/posts", permanent: false },
      { source: "/trip-reports/new", destination: "/upload?kind=post", permanent: false },
      { source: "/trip-reports/:path*", destination: "/posts", permanent: false },
      { source: "/trip-reports", destination: "/posts", permanent: false },
      { source: "/posts/new", destination: "/upload?kind=post", permanent: false },
      { source: "/notifications", destination: "/community", permanent: false },
      { source: "/notifications/:path*", destination: "/community", permanent: false },
      { source: "/peak-finder/sw.js", destination: "/sw-peak-finder.js", permanent: false },
    ];
  },
};

export default nextConfig;
