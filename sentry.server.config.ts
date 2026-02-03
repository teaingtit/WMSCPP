// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Filter out non-critical errors
  beforeSend(event, hint) {
    // Filter out specific error types that are expected
    if (hint.originalException instanceof Error) {
      const message = hint.originalException.message;

      // Skip authentication-related errors (expected behavior)
      if (message?.includes('Unauthenticated') || message?.includes('Unauthorized')) {
        return null;
      }

      // Skip rate limit errors (handled by the app)
      if (message?.includes('Rate limit')) {
        return null;
      }
    }
    return event;
  },

  // Environment
  environment: process.env.NODE_ENV,
});
