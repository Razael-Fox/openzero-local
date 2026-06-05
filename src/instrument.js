import * as Sentry from '@sentry/node';
import { config } from './config.js';

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    // Tracing performance
    tracesSampleRate: 1.0,
    environment: config.nodeEnv
  });
}
