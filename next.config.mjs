/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during build
    ignoreBuildErrors: true,
  },
  // Remove devServer as it's not a valid Next.js config option
  // For custom port, use: next dev -p 3000
};

export default nextConfig;
