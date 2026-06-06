import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import { downloadIcon } from '../../utils/iconHelper.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('icon-to-sticker')
    .setDescription('Download an icon and add it as a sticker in this server.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the icon (e.g., github, heart, star, user)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('provider')
        .setDescription('Icon provider to use (default: fontawesome)')
        .setRequired(false)
        .addChoices(
          { name: 'Font Awesome', value: 'fontawesome' },
          { name: 'Lucide Icons', value: 'lucide' },
          { name: 'Simple Icons', value: 'simpleicons' }
        )
    )
    .addStringOption(option =>
      option.setName('sticker_name')
        .setDescription('The name of the sticker to create (defaults to icon name)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('emoji_tag')
        .setDescription('A single unicode emoji tag representing the sticker (default: 💬)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const provider = interaction.options.getString('provider') || 'fontawesome';
    const stickerName = interaction.options.getString('sticker_name') || name;
    const emojiTag = interaction.options.getString('emoji_tag') || '💬';

    // Verify client has permission to manage emojis and stickers
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const errorEmbed = new V2Embed()
        .setTitle('Permission Denied ❌')
        .setDescription('The bot does not have `Manage Emojis and Stickers` permission on this server.')
        .setColor(0xff3333)
        .build();
      return await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      // Download the icon as PNG, constrained to 320x320 size for Discord stickers
      const icon = await downloadIcon(name, provider, { size: 320 });

      // Create the sticker in the guild
      const sticker = await interaction.guild.stickers.create({
        file: icon.filePath,
        name: stickerName,
        tags: emojiTag,
        description: `Icon: ${name} from provider ${provider}`
      });

      const successEmbed = new V2Embed()
        .setTitle('Sticker Created ✅')
        .setDescription(
          `Successfully created a new sticker in this server!\n\n` +
          `*   **Sticker Name:** \`${sticker.name}\`\n` +
          `*   **Emoji Tag:** ${emojiTag}\n` +
          `*   **Original Icon:** \`${name}\` (${provider})`
        )
        .setColor(0x00ffd2);

      await interaction.editReply({
        components: [successEmbed.build()],
        flags: MessageFlags.IsComponentsV2
      });

      logger.info(`[Sticker] Created sticker "${sticker.name}" in guild "${interaction.guild.name}" using icon "${name}"`);
    } catch (error) {
      logger.error('[Sticker Error] Failed to create sticker:', error);
      const errorEmbed = new V2Embed()
        .setTitle('Sticker Creation Failed ❌')
        .setDescription(error.message)
        .setColor(0xff3333)
        .build();

      await interaction.editReply({
        components: [errorEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
