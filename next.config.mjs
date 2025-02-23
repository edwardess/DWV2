/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      // WARNING: Disabling type checking is not recommended for production.
      ignoreBuildErrors: true,
    },
    // ...other config options
  };
  
  export default nextConfig;
  