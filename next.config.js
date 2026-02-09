/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    emotion: true,
  },
  transpilePackages: ['@mui/material', '@mui/icons-material'],
}

module.exports = nextConfig
