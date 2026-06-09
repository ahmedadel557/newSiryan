import * as Sentry from '@sentry/node';


Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,

  enableLogs: true,
  enableMetrics: true,

  // Forward console.error/warn (used throughout the cron jobs and services) to Sentry Logs.
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['error', 'warn'] }),
  ],

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
