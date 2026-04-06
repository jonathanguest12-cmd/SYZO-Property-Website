import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'd19qeljo1i8r7y.cloudfront.net' },
    ],
  },
};

export default nextConfig;
