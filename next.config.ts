import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      phaser: 'phaser/dist/phaser.js',
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      phaser: 'phaser/dist/phaser.js',
    },
  },
};

export default nextConfig;
