import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    forceSwcTransforms: false,
  },

  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tensorflow/tfjs-core': require.resolve('@tensorflow/tfjs-core'),
    };

    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/@tensorflow/**',
          '**/node_modules/face-api.js/**',
          '**/lib/face-recognition-browser.js',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;