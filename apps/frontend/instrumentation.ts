import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Skip the heavy @sentry/node server SDK in dev. With `includeLocalVariables`
  // it opens a V8 inspector session and sets exception breakpoints, which
  // deoptimises the runtime — Turbopack throws/catches many exceptions during
  // first-request module evaluation, ballooning a ~400ms render to ~40s.
  // Dev errors already surface in the terminal; we only need Sentry in prod.
  if (process.env.NODE_ENV !== 'production') return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
