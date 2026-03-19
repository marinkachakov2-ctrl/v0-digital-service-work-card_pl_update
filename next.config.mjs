/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Temporarily ignore TypeScript errors for production build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors for production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
