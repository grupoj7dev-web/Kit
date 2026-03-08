import { createRequire } from 'module';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Ensure MiniCssExtractPlugin is present when needed by loaders
    if (!isServer) {
      try {
        const require = createRequire(import.meta.url);
        const MiniCssExtractPlugin = require('mini-css-extract-plugin');
        const has = config.plugins.some(p => p && p.constructor && p.constructor.name === 'MiniCssExtractPlugin');
        if (!has) {
          config.plugins.push(new MiniCssExtractPlugin());
        }
      } catch (e) {
        // if the plugin isn't installed or fails, continue without throwing during build
        console.warn('MiniCssExtractPlugin not available:', e && e.message ? e.message : e);
      }
    }
    return config;
  }
}

export default nextConfig