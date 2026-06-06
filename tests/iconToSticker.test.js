import { jest } from '@jest/globals';
import { PermissionFlagsBits } from 'discord.js';

// Mock logger to avoid console output during tests
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock iconHelper downloadIcon function
jest.unstable_mockModule('../src/utils/iconHelper.js', () => ({
  downloadIcon: jest.fn().mockResolvedValue({
    filePath: '/dummy/path/github.png',
    fileName: 'github.png',
    ext: 'png',
    localUrl: 'attachment://github.png'
  })
}));

const iconToStickerCmd = (await import('../src/commands/utility/iconToSticker.js')).default;

describe('Icon to Sticker Slash Command Test Suite', () => {
  let mockInteraction;
  let mockStickersCreate;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStickersCreate = jest.fn().mockResolvedValue({ name: 'github' });

    mockInteraction = {
      deferReply: jest.fn(),
      editReply: jest.fn(),
      options: {
        getString: jest.fn((name) => {
          if (name === 'name') return 'github';
          if (name === 'provider') return 'fontawesome';
          if (name === 'sticker_name') return 'github';
          if (name === 'emoji_tag') return '💬';
          return null;
        })
      },
      guild: {
        name: 'Test Guild',
        members: {
          me: {
            permissions: {
              has: jest.fn().mockReturnValue(true)
            }
          }
        },
        stickers: {
          create: mockStickersCreate
        }
      }
    };
  });

  test('should successfully download icon and create guild sticker', async () => {
    await iconToStickerCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockStickersCreate).toHaveBeenCalledWith(expect.objectContaining({
      file: '/dummy/path/github.png',
      name: 'github',
      tags: '💬'
    }));
    expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.objectContaining({
      components: expect.any(Array)
    }));
  });

  test('should fail if bot does not have ManageEmojisAndStickers permission', async () => {
    mockInteraction.guild.members.me.permissions.has.mockReturnValue(false);

    await iconToStickerCmd.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockStickersCreate).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalled();
    const replyArg = mockInteraction.editReply.mock.calls[0][0];
    const comp = replyArg.components[0];
    const data = comp.toJSON ? comp.toJSON() : comp.data;
    expect(data.accent_color).toBe(0xff3333);
  });
});
