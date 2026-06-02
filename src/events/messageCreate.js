import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
  name: Events.MessageCreate,
  once: false,
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    // Abaikan pesan dari bot lain (dan diri sendiri)
    if (message.author.bot) return;

    // Catat aktivitas pesan masuk menggunakan Logger Handler (observasi/log saja)
    logger.info(
      `[Message] [${message.guild?.name || 'DM'}] #${message.channel.name || 'unknown'} | ${message.author.tag}: ${message.content}`
    );
  }
};
