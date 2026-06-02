import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Menyapa pengguna atau member lain.')
    .addUserOption(option => 
      option
        .setName('target')
        .setDescription('Member yang ingin disapa (opsional)')
        .setRequired(false)
    )
    .setDMPermission(false),
  
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    
    if (targetUser.id === interaction.user.id) {
      await interaction.reply(`Halo ${interaction.user}! Semoga harimu menyenangkan! 👋`);
    } else {
      await interaction.reply(`Halo ${targetUser}! Kamu disapa oleh ${interaction.user}! 👋`);
    }
  },
};
