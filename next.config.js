/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
