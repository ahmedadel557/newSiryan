import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enableLogs: true,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
