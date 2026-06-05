import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { getObtainiumEmbed } from '../utils/obtainiumHelper.js';

// Memuat variabel lingkungan
dotenv.config();

const TARGET_CHANNEL_ID = '1511326472219001014';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  logger.info(
    `[Script] Terhubung sebagai ${client.user.tag}. Menyiapkan pengiriman daftar Obtainium...`
  );

  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      logger.error(
        `[Script] Channel ID ${TARGET_CHANNEL_ID} tidak ditemukan atau bukan channel teks!`
      );
      process.exit(1);
    }

    logger.info('[Script] Menghasilkan V2Embed halaman 1 (index 0)...');
    const obtainiumEmbed = await getObtainiumEmbed(0);

    logger.info(`[Script] Mengirim pesan ke channel #${channel.name || TARGET_CHANNEL_ID}...`);
    const sentMessage = await channel.send({
      components: [obtainiumEmbed],
      flags: MessageFlags.IsComponentsV2
    });

    logger.info(`[Script] Sukses! Pesan terkirim dengan tautan: ${sentMessage.url}`);
    process.exit(0);
  } catch (error) {
    logger.error('[Script] Terjadi kesalahan saat mengirim pesan Obtainium:', error);
    process.exit(1);
  }
});

// Login ke Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error('[Script] DISCORD_TOKEN tidak diatur di berkas .env!');
  process.exit(1);
}

client.login(token);
