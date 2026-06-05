import { jest } from '@jest/globals';

// Mock Sentry Node SDK
jest.unstable_mockModule('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn()
}));

const Sentry = await import('@sentry/node');

// Set mock environment variables
process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
process.env.NODE_ENV = 'test';

// Import instrument and logger
await import('../src/instrument.js');
const { default: logger } = await import('../src/utils/logger.js');

describe('Sentry Integration Test Suite', () => {
  beforeEach(() => {
    Sentry.captureException.mockClear();
    Sentry.captureMessage.mockClear();
    Sentry.addBreadcrumb.mockClear();
  });

  test('should initialize Sentry on import if SENTRY_DSN is configured', () => {
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
        environment: 'test'
      })
    );
  });

  test('should capture exceptions through winston logger.error', () => {
    const testError = new Error('Test Sentry Error');
    logger.error('Log message with error', { error: testError });

    expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.any(Object));
  });

  test('should capture warnings through winston logger.warn', () => {
    logger.warn('Test Sentry Warning');

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      '[WARN] (System)\nTest Sentry Warning',
      expect.objectContaining({ level: 'warning' })
    );
  });

  test('should capture info logs through Sentry.addBreadcrumb', () => {
    logger.info('Test Sentry Info Log');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'log',
        message: '[UNKNOWN] (System)\nTest Sentry Info Log',
        level: 'info'
      })
    );
  });
});
