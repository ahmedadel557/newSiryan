import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.siryan.xyz' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@stream-io/video-react-sdk',
      'stream-chat',
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

// Skip the Sentry webpack plugin in dev — it wraps the entire webpack pipeline
// (module instrumentation + source-map processing) and adds ~30-40 s to every
// cold compile. The SDK still initialises in dev via instrumentation*.ts files.
export default isDev
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: false,
      tunnelRoute: '/monitoring',
      silent: !process.env.CI,
      disableLogger: true,
    });
