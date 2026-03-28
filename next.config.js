/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Performance optimizations
  compress: true,
  // Optimize production builds
  swcMinify: true,
  // Granular chunking for better caching
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'clsx', 'class-variance-authority'],
  },
}

module.exports = nextConfig
