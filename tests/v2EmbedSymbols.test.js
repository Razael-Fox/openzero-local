import { jest } from '@jest/globals';
import { V2Embed } from '../src/utils/v2Embed.js';
import { Symbols } from '../src/utils/symbols.js';
import { TextDisplayBuilder } from 'discord.js';

describe('V2Embed Symbols Auto-Formatting Test Suite', () => {
  let setContentSpy;

  beforeEach(() => {
    setContentSpy = jest.spyOn(TextDisplayBuilder.prototype, 'setContent');
  });

  afterEach(() => {
    setContentSpy.mockRestore();
  });

  test('should automatically replace emojis and layout symbols in title', () => {
    new V2Embed()
      .setTitle('Action Failed ❌ and Success ✅! 🏓 ⏱️')
      .build();

    expect(setContentSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Action Failed ${Symbols.FAILURE} and Success ${Symbols.SUCCESS}! ${Symbols.PING} ${Symbols.COOLDOWN}`)
    );
  });

  test('should automatically replace layout symbols in description', () => {
    new V2Embed()
      .setDescription('↳ Step 1: 🎵 Play music 🎤 Sing along')
      .build();

    expect(setContentSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${Symbols.ENTER} Step 1: ${Symbols.MUSIC} Play music ${Symbols.MICROPHONE} Sing along`)
    );
  });
});
