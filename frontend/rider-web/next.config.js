/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ebike/types', '@ebike/api-client'],
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/register',
        permanent: true,
      },
    ];
  },
};

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  workboxOptions: {
    // Prevent service worker from masking 400/500 API errors as "ERR_FAILED"
    navigateFallback: null,
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'others',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  withPWA(nextConfig),
  {
    silent: true,
    org: 'scooterfy',
    project: 'rider-web',
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
  },
);
