import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
  name: Events.InteractionCreate,
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction 
   */
  async execute(interaction) {
    // Penanganan Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'ping_refresh') {
        try {
          // Memberitahu Discord bahwa bot menerima klik tombol
          await interaction.deferUpdate();
          
          const latency = Date.now() - interaction.createdTimestamp;
          
          // Import modul secara dinamis untuk efisiensi
          const { V2Embed } = await import('../utils/v2Embed.js');
          const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
          
          const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('ping_refresh')
              .setLabel('Ukur Ulang')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄')
          );

          const embed = new V2Embed()
            .setTitle('Pong! 🏓')
            .setDescription(
              `*   **Latency Interaksi:** \`${latency}ms\`\n` +
              `*   **Heartbeat API:** \`${interaction.client.ws.ping}ms\``
            )
            .addActionRow(buttonRow)
            .build();

          // Mengedit balasan interaksi yang sudah ada
          await interaction.editReply({
            components: [embed],
            flags: MessageFlags.IsComponentsV2
          });

          logger.info(`[Button Clicked] ping_refresh diproses untuk ${interaction.user.tag} (Latency: ${latency}ms)`);
        } catch (error) {
          logger.error('[Button Error] Gagal memproses interaksi tombol ping_refresh:', error);
        }
      }
      return;
    }

    // Hanya memproses command berbasis Slash Commands (Chat Input)
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`[Command Handler] Slash command /${interaction.commandName} dipanggil tapi tidak terdaftar.`);
      return;
    }

    // Catat log eksekusi command
    logger.info(`[Command Executed] /${interaction.commandName} oleh ${interaction.user.tag} di #${interaction.channel.name}`);

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`[Command Error] Terjadi kesalahan saat mengeksekusi /${interaction.commandName}:`, error);
      
      const errorMessage = 'Maaf, terjadi kesalahan saat menjalankan perintah ini!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
