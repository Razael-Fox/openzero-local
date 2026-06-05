import { jest } from '@jest/globals';

// Mock logger to avoid console spam and file writes during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock google-translate-api
jest.unstable_mockModule('@vitalets/google-translate-api', () => ({
  translate: jest.fn().mockResolvedValue({
    text: 'Hello world, this is a test!',
    raw: {
      src: 'id'
    }
  })
}));

// Import command dynamically after mocking
const translateCmd = (await import('../src/commands/utility/translate.js')).default;
const { translate: mockTranslate } = await import('@vitalets/google-translate-api');

describe('Translate Context Menu Command', () => {
  let mockInteraction;
  let mockMessage;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessage = {
      content: 'Halo dunia, ini adalah tes!'
    };

    mockInteraction = {
      targetMessage: mockMessage,
      user: { id: 'executor_456', tag: 'User#0001' },
      commandName: 'Translate to English',
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true)
    };
  });

  test('should translate message successfully', async () => {
    await translateCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockTranslate).toHaveBeenCalledWith('Halo dunia, ini adalah tes!', { to: 'en' });
    expect(mockInteraction.editReply).toHaveBeenCalled();

    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    expect(replyArg.components).toBeDefined();
  });

  test('should fail if message content is empty', async () => {
    mockMessage.content = '';

    await translateCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockTranslate).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
  });

  test('should handle api errors gracefully', async () => {
    mockTranslate.mockRejectedValueOnce(new Error('API Down'));

    await translateCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockInteraction.editReply).toHaveBeenCalled();
  });
});
