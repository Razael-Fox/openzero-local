import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { V2Embed } from '../utils/v2Embed.js';

// Memuat env variables
dotenv.config();

const CHANNEL_ID = '1498000052839383191';
const MESSAGE_ID = '1511157565868871870';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  logger.info(`[Script] Terhubung sebagai ${client.user.tag}. Menyiapkan pengeditan Rules...`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    if (!channel || !channel.isTextBased()) {
      logger.error(`[Script] Channel ID ${CHANNEL_ID} tidak ditemukan atau bukan channel teks!`);
      process.exit(1);
    }

    // Mengambil pesan peraturan yang sudah ada untuk diedit
    logger.info(`[Script] Mengambil pesan dengan ID ${MESSAGE_ID}...`);
    const message = await channel.messages.fetch(MESSAGE_ID);

    if (!message) {
      logger.error(`[Script] Pesan ID ${MESSAGE_ID} tidak ditemukan!`);
      process.exit(1);
    }

    // Membuat Tombol Link untuk disematkan di dalam V2Embed (tanpa emoji untuk meminimalkan emoji)
    const linkButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('GitHub Razael-Labs')
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/Razael-Labs/openzero-local'),
      new ButtonBuilder()
        .setLabel('Dokumentasi OpenZero')
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/Razael-Labs/openzero-local#readme')
    );

    // Menyusun isi Peraturan Server (Rules) dengan V2Embed yang minim emoji
    const rulesEmbed = new V2Embed()
      .setTitle('Peraturan Server OpenZero Komunitas')
      .setDescription(
        `Selamat datang di server komunitas OpenZero, wadah kolaborasi bagi pengguna bot OpenZero serta para kontributor proyek sumber terbuka (open-source).\n\n` +
        `Harap baca dan patuhi peraturan berikut demi kenyamanan bersama:\n\n` +
        
        `### 1. Saling Menghormati & Inklusi\n` +
        `*   Selalu bersikap sopan dan menghargai sesama anggota.\n` +
        `*   Tindakan pelecehan, ujaran kebencian, rasisme, atau diskriminasi dalam bentuk apa pun dilarang keras.\n\n` +
        
        `### 2. Penggunaan Channel Sesuai Topik\n` +
        `*   Gunakan channel diskusi sesuai dengan topik yang ditentukan. Jaga obrolan pengembangan di channel dev, tanya jawab bot di channel support, dan obrolan umum di general.\n` +
        `*   Hindari aktivitas spam teks, emoji berlebih, atau mention staf tanpa tujuan yang jelas.\n\n` +
        
        `### 3. Keamanan & Integritas Kode\n` +
        `*   Dilarang membagikan kode berbahaya (malicious code), token grabber, malware, atau perangkat lunak bajakan.\n` +
        `*   Hargai lisensi kode dan hasil karya pengembang lain. Tindakan plagiarisme tidak akan ditoleransi.\n\n` +
        
        `### 4. Larangan Promosi Tanpa Izin\n` +
        `*   Dilarang membagikan tautan undangan server Discord lain atau promosi komersial tanpa persetujuan pihak moderator.\n` +
        `*   Gunakan sarana pameran proyek yang disediakan jika ingin mendemokan karya open-source Anda.\n\n` +
        
        `### 5. Kepatuhan Terhadap Ketentuan Discord\n` +
        `*   Seluruh anggota wajib mematuhi Ketentuan Layanan Discord dan Panduan Komunitas Discord setiap saat.\n\n` +
        
        `Pelanggaran terhadap peraturan di atas dapat mengakibatkan tindakan administratif mulai dari peringatan, pembatasan akses obrolan, hingga pemblokiran akun dari server.`
      )
      .addActionRow(linkButtons)
      .build();

    // Mengedit pesan yang ada
    logger.info(`[Script] Mengedit pesan Rules...`);
    await message.edit({
      content: '', // Menghapus pesan teks lama jika ada
      components: [rulesEmbed],
      flags: MessageFlags.IsComponentsV2
    });

    logger.info('[Script] Pesan Rules sukses diperbarui dengan metode Edit menggunakan V2Embed!');
    process.exit(0);
  } catch (error) {
    logger.error('[Script] Terjadi kesalahan saat mengedit Rules:', error);
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
