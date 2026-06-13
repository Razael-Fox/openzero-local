import { jest } from '@jest/globals';

// Setup Mock for child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Setup Mock for logger to avoid stdout noise during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Dynamically import dependencies after mocking
const { sanitizeData, handleHealingInteraction } = await import('../src/utils/selfHealing.js');
const { MessageFlags } = await import('discord.js');

describe('AI Agent Self-Healing System Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      OWNER_ID: '999999999999999999',
      DISCORD_TOKEN: 'MOCK_TOKEN_SECRET',
      GROQ_API_KEY: 'gsk_mock_groq_key_secret',
      SUPABASE_KEY: 'sb_mock_supabase_key_secret'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Data Sanitization', () => {
    test('should redact raw discord tokens, supabase keys, and env variables', () => {
      const input = 'Error: token is MOCK_TOKEN_SECRET, groq key is gsk_mock_groq_key_secret, and supabase is sb_mock_supabase_key_secret. Also discord style token 123456789012345678901234.123456.123456789012345678901234567';
      const result = sanitizeData(input);
      expect(result).not.toContain('MOCK_TOKEN_SECRET');
      expect(result).not.toContain('gsk_mock_groq_key_secret');
      expect(result).not.toContain('sb_mock_supabase_key_secret');
      expect(result).toContain('[REDACTED_DISCORD_TOKEN]');
      expect(result).toContain('[REDACTED_SUPABASE_KEY]');
      expect(result).toContain('[REDACTED_GROQ_KEY]');
    });

    test('should return empty string for falsy input', () => {
      expect(sanitizeData(null)).toBe('');
      expect(sanitizeData(undefined)).toBe('');
    });
  });

  describe('Healing Button Interactions', () => {
    let mockInteraction;

    beforeEach(() => {
      mockInteraction = {
        customId: 'ai_approve_healing_ai-patch/music-1700000000000_music',
        user: { id: '999999999999999999' },
        deferUpdate: jest.fn().mockResolvedValue(),
        reply: jest.fn().mockResolvedValue(),
        editReply: jest.fn().mockResolvedValue(),
        followUp: jest.fn().mockResolvedValue()
      };
    });

    test('should block non-owner users from executing action', async () => {
      mockInteraction.user.id = '111111111111111111'; // Not the owner
      await handleHealingInteraction(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Hanya Bot Owner'),
          flags: MessageFlags.Ephemeral
        })
      );
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    test('should perform merge and delete branch on approval', async () => {
      mockInteraction.customId = 'ai_approve_healing_ai-patch/music-1700000000000_music';
      await handleHealingInteraction(mockInteraction);

      expect(mockInteraction.deferUpdate).toHaveBeenCalled();
      expect(mockExecSync).toHaveBeenCalledWith('git merge ai-patch/music-1700000000000', { stdio: 'ignore' });
      expect(mockExecSync).toHaveBeenCalledWith('git branch -D ai-patch/music-1700000000000', { stdio: 'ignore' });
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
          flags: MessageFlags.IsComponentsV2
        })
      );
    });

    test('should delete branch and discard patch on rejection', async () => {
      mockInteraction.customId = 'ai_reject_healing_ai-patch/music-1700000000000_music';
      await handleHealingInteraction(mockInteraction);

      expect(mockInteraction.deferUpdate).toHaveBeenCalled();
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('git merge'), expect.any(Object));
      expect(mockExecSync).toHaveBeenCalledWith('git branch -D ai-patch/music-1700000000000', { stdio: 'ignore' });
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
          flags: MessageFlags.IsComponentsV2
        })
      );
    });
  });
});
