import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { t } from '../../utils/i18n.js';

export default {
  title: 'Menu',
  command: '/menu',
  description: 'Menampilkan daftar perintah bot.',
  num: 100,
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Menampilkan daftar perintah bot.')
    .setNameLocalizations({
      'id': 'menu',
      'en-US': 'menu',
      'en-GB': 'menu'
    })
    .setDescriptionLocalizations({
      'id': 'Menampilkan daftar perintah bot.',
      'en-US': 'Displays the bot command list.',
      'en-GB': 'Displays the bot command list.'
    })
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const locale = interaction.locale;
    const commands = interaction.client.commands;

    const categories = {};
    commands.forEach((cmd) => {
      const category = cmd.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(cmd);
    });

    const sortedCategories = Object.keys(categories).sort();

    // Sort commands in each category
    for (const cat of sortedCategories) {
      categories[cat].sort((a, b) => {
        const numA = typeof a.num === 'number' ? a.num : 9999;
        const numB = typeof b.num === 'number' ? b.num : 9999;
        if (numA !== numB) return numA - numB;
        const nameA = (a.title || a.data.name).toLowerCase();
        const nameB = (b.title || b.data.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    let descriptionText = t('helpDescription', locale);

    for (const cat of sortedCategories) {
      const capitalizedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
      descriptionText += `### 📁 ${t('helpCategory', locale)}: ${capitalizedCat}\n`;

      for (const cmd of categories[cat]) {
        const name = cmd.title || cmd.data.name;

        // Handle command syntax format
        const isSlash = !cmd.data.type || cmd.data.type === 1;
        const defaultCommandFormat = isSlash ? `/${cmd.data.name}` : cmd.data.name;
        const cmdSyntax = cmd.command || defaultCommandFormat;

        const desc = cmd.description || cmd.data.description || '-';
        const numPrefix = typeof cmd.num === 'number' ? `\`[${cmd.num}]\` ` : '';

        descriptionText += `*   ${numPrefix}**${name}**\n` +
                           `    *   **${t('helpCommandFormat', locale)}:** \`${cmdSyntax}\`\n` +
                           `    *   **${t('helpDescriptionFormat', locale)}:** ${desc}\n\n`;
      }
    }

    const embed = new V2Embed()
      .setContext(interaction)
      .setTitle(t('helpTitle', locale))
      .setDescription(descriptionText)
      .build();

    await interaction.reply({
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
