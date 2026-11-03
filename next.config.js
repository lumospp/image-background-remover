/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Export a static site for Cloudflare Pages. The generated site is in out/.
}

module.exports = nextConfig
