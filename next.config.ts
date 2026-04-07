import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd19qeljo1i8r7y.cloudfront.net',
        pathname: '/images/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [128, 256, 384],
    qualities: [70, 75, 80, 85, 90],
    formats: ['image/webp'],
  },
};

export default nextConfig;
