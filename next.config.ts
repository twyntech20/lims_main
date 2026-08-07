import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fqlabs.com',
      },
    ],
  },
};

export default nextConfig;
