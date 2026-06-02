import { Events, ActivityType } from 'discord.js';
import { deployCommands } from '../handlers/commandHandler.js';
import logger from '../utils/logger.js';
import { config } from '../config.js';

export default {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client 
   */
  async execute(client) {
    logger.info(`[Client] Login berhasil! Bot aktif sebagai ${client.user.tag}`);
    
    // Set aktivitas kehadiran bot dari Global Config
    try {
      const actName = config.activity?.name;
      const actTypeString = config.activity?.type || 'PLAYING';
      
      const typeMap = {
        PLAYING: ActivityType.Playing,
        STREAMING: ActivityType.Streaming,
        LISTENING: ActivityType.Listening,
        WATCHING: ActivityType.Watching,
        COMPETING: ActivityType.Competing
      };
      
      const actType = typeMap[actTypeString.toUpperCase()] || ActivityType.Playing;

      if (actName) {
        client.user.setActivity(actName, { type: actType });
        logger.info(`[Client] Aktivitas bot diatur menjadi: ${actTypeString} ${actName}`);
      }
    } catch (error) {
      logger.error('[Client] Gagal mengatur aktivitas bot:', error);
    }
    
    // Daftarkan slash commands secara otomatis saat bot aktif
    await deployCommands(client);
  },
};
