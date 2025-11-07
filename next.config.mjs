/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // WARNING: Disabling type checking is not recommended for production.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dwva2-efed3.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    // Set minimumCacheTTL to leverage caching but allow for revalidation
    minimumCacheTTL: 3600, // 1 hour in seconds
    // Add deviceSizes to optimize responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Add formats to support modern image formats
    formats: ['image/webp', 'image/avif'],
  },
  // ...other config options
};

export default nextConfig;
