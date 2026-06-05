import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Load environmental variables since this module is loaded before index.js
dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Tracing performance
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development'
  });
}
