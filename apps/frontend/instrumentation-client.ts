import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  tracesSampleRate: isDev ? 0 : 0.1,

  // Session replay is only useful in production — skip the large integration bundle in dev.
  replaysSessionSampleRate: isDev ? 0 : 0.1,
  replaysOnErrorSampleRate: isDev ? 0 : 1.0,

  integrations: isDev ? [] : [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
