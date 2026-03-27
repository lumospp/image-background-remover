/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.remove.bg',
      },
    ],
  },
}

module.exports = nextConfig
