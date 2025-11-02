/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable custom server for WebSocket support
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig