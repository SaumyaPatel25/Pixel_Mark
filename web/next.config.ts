import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
