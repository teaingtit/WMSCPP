// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  replaysSessionSampleRate: 0.1,

  // If you don't want to use Session Replay, set this to 0.
  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out non-critical errors
  beforeSend(event, hint) {
    // Filter out AbortError (common in cancelled requests)
    if (hint.originalException instanceof Error) {
      if (hint.originalException.name === 'AbortError') {
        return null;
      }
      // Filter out network errors that are expected
      if (hint.originalException.message?.includes('Failed to fetch')) {
        return null;
      }
    }
    return event;
  },

  // Performance monitoring - only capture slow transactions
  beforeSendTransaction(event) {
    // Filter out transactions that took less than 1 second
    const duration =
      event.timestamp && event.start_timestamp
        ? (event.timestamp - event.start_timestamp) * 1000
        : 0;
    if (duration < 1000) {
      return null;
    }
    return event;
  },

  // Environment
  environment: process.env.NODE_ENV,
});
