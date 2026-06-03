import {
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Mengelola webhook di server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
    .setDMPermission(false)
    // SUBCOMMAND: CREATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Membuat webhook baru di channel tertentu.')
        .addStringOption((option) =>
          option
            .setName('title')
            .setDescription('Nama atau title webhook yang ingin dibuat')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel tempat webhook akan dibuat')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('pfp')
            .setDescription('URL gambar profil/avatar untuk webhook (opsional)')
            .setRequired(false)
        )
    )
    // SUBCOMMAND: INFO
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Melihat informasi atau detail dari webhook berdasarkan ID atau URL.')
        .addStringOption((option) =>
          option
            .setName('id_or_url')
            .setDescription('Masukkan Webhook ID atau Webhook URL lengkap')
            .setRequired(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (subcommand === 'create') {
      const title = interaction.options.getString('title');
      const channel = interaction.options.getChannel('channel');
      const pfp = interaction.options.getString('pfp') || null;

      try {
        // Validasi format URL jika pfp diberikan
        if (pfp && !pfp.startsWith('http://') && !pfp.startsWith('https://')) {
          const embedError = new V2Embed()
            .setTitle('Gagal Membuat Webhook ❌')
            .setDescription('URL avatar/pfp yang Anda masukkan tidak valid. Harus dimulai dengan `http://` atau `https://`.')
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedError],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Membuat webhook di channel yang ditentukan
        const webhook = await channel.createWebhook({
          name: title,
          avatar: pfp,
          reason: `Dibuat oleh ${interaction.user.tag} via slash command.`
        });

        // Tombol aksi interaktif V2 untuk menyalin URL Webhook (menggunakan tombol link)
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Salin URL Webhook')
            .setStyle(ButtonStyle.Link)
            .setURL(webhook.url)
            .setEmoji('📋')
        );

        const embedSuccess = new V2Embed()
          .setTitle('Webhook Berhasil Dibuat! 🎉')
          .setDescription(
            `*   **Nama Webhook:** \`${webhook.name}\`\n` +
            `*   **Channel:** ${channel}\n` +
            `*   **ID Webhook:** \`${webhook.id}\`\n` +
            `*   **Token:** \`||${webhook.token}||\``
          )
          .addActionRow(actionRow)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Webhook Created] Webhook "${title}" berhasil dibuat di #${channel.name} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Webhook Error] Gagal membuat webhook:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Membuat Webhook ❌')
          .setDescription(`Terjadi kesalahan saat mencoba membuat webhook: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } 
    
    else if (subcommand === 'info') {
      const idOrUrl = interaction.options.getString('id_or_url').trim();

      try {
        let webhookId = idOrUrl;
        let webhookToken = null;

        // Mencoba mengekstrak ID dan Token jika input berupa URL Webhook Discord
        const webhookUrlRegex = /discord\.com\/api\/webhooks\/(\d+)\/([\w-]+)/;
        const match = idOrUrl.match(webhookUrlRegex);
        if (match) {
          webhookId = match[1];
          webhookToken = match[2];
        }

        // Mengambil data Webhook dari server
        let webhook = null;
        if (webhookToken) {
          // Mengambil via client menggunakan id & token
          webhook = await interaction.client.fetchWebhook(webhookId, webhookToken);
        } else {
          // Mencari di guild saat ini berdasarkan Webhook ID
          const webhooks = await interaction.guild.fetchWebhooks();
          webhook = webhooks.get(webhookId);
        }

        if (!webhook) {
          const embedNotFound = new V2Embed()
            .setTitle('Webhook Tidak Ditemukan ❌')
            .setDescription('Tidak dapat menemukan webhook dengan ID atau URL yang diberikan di server ini.')
            .setColor(0xff0000)
            .build();

          return await interaction.editReply({
            components: [embedNotFound],
            flags: MessageFlags.IsComponentsV2
          });
        }

        // Tombol aksi interaktif V2 untuk menyalin URL Webhook
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Salin URL Webhook')
            .setStyle(ButtonStyle.Link)
            .setURL(webhook.url)
            .setEmoji('📋')
        );

        // Mengambil informasi channel target webhook
        const channel = interaction.guild.channels.cache.get(webhook.channelId) || `<#${webhook.channelId}>`;

        const embedInfo = new V2Embed()
          .setTitle('Detail Webhook 🔍')
          .setDescription(
            `*   **Nama Webhook:** \`${webhook.name}\`\n` +
            `*   **Channel:** ${channel}\n` +
            `*   **ID Webhook:** \`${webhook.id}\`\n` +
            `*   **Dibuat Oleh:** ${webhook.owner ? `${webhook.owner} (\`${webhook.owner.id}\`)` : 'Tidak diketahui'}`
          )
          .addActionRow(actionRow)
          .build();

        await interaction.editReply({
          components: [embedInfo],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Webhook Info] Detail webhook ${webhook.id} berhasil ditampilkan untuk ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Webhook Info Error] Gagal mengambil informasi webhook:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Mengambil Detail Webhook ❌')
          .setDescription(`Terjadi kesalahan saat memproses permintaan: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};
