import { Client, GatewayIntentBits } from 'discord.js';
import logger from '../utils/logger.js';
import { updateObtainiumMessage } from '../utils/obtainiumHelper.js';
import { config } from '../config.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  logger.info(
    `[Script] Terhubung sebagai ${client.user.tag}. Menyiapkan pembaruan daftar Obtainium...`
  );

  try {
    const success = await updateObtainiumMessage(client);
    if (success) {
      logger.info('[Script] Sukses memperbarui/mengirim pesan Obtainium!');
      process.exit(0);
    } else {
      logger.error('[Script] Gagal memperbarui pesan Obtainium.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('[Script] Terjadi kesalahan saat memproses Obtainium:', error);
    process.exit(1);
  }
});

// Login ke Discord
const token = config.token;
if (!token) {
  logger.error('[Script] Token tidak diatur di konfigurasi/file .env!');
  process.exit(1);
}

client.login(token);
