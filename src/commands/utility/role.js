import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Mengelola role atau peran untuk pengguna di server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    // SUBCOMMAND: ADD
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Menambahkan role ke pengguna tertentu.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Pengguna yang ingin diberikan role')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin ditambahkan')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: REMOVE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Menghapus role dari pengguna tertentu.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Pengguna yang rolenya ingin dihapus')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin dihapus')
            .setRequired(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('role');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Mendapatkan GuildMember target
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      const embedError = new V2Embed()
        .setTitle('Pengguna Tidak Ditemukan ❌')
        .setDescription('Tidak dapat menemukan pengguna tersebut di dalam server ini.')
        .setColor(0xff0000)
        .build();

      return await interaction.editReply({
        components: [embedError],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Mendapatkan posisi tertinggi bot di server untuk validasi hierarki role
    const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    if (targetRole.position >= botMember.roles.highest.position) {
      const embedError = new V2Embed()
        .setTitle('Gagal Mengelola Role ❌')
        .setDescription(`Tidak dapat mengelola role ${targetRole} karena posisinya sama atau lebih tinggi dari posisi role tertinggi bot ini.`)
        .setColor(0xff0000)
        .build();

      return await interaction.editReply({
        components: [embedError],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === 'add') {
      try {
        if (member.roles.cache.has(targetRole.id)) {
          const embedInfo = new V2Embed()
            .setTitle('Informasi Role ℹ️')
            .setDescription(`${targetUser} sudah memiliki role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.add(targetRole, `Diberikan oleh ${interaction.user.tag} via slash command.`);

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Ditambahkan! 🎉')
          .setDescription(`Berhasil menambahkan role ${targetRole} ke pengguna ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Added] Role "${targetRole.name}" ditambahkan ke ${targetUser.tag} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Add Error] Gagal menambahkan role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Menambahkan Role ❌')
          .setDescription(`Terjadi kesalahan saat menambahkan role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } 
    
    else if (subcommand === 'remove') {
      try {
        if (!member.roles.cache.has(targetRole.id)) {
          const embedInfo = new V2Embed()
            .setTitle('Informasi Role ℹ️')
            .setDescription(`${targetUser} tidak memiliki role ${targetRole}.`)
            .setColor(0xffd700)
            .build();

          return await interaction.editReply({
            components: [embedInfo],
            flags: MessageFlags.IsComponentsV2
          });
        }

        await member.roles.remove(targetRole, `Dihapus oleh ${interaction.user.tag} via slash command.`);

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Dihapus! 🛡️')
          .setDescription(`Berhasil menghapus role ${targetRole} dari pengguna ${targetUser}.`)
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Removed] Role "${targetRole.name}" dihapus dari ${targetUser.tag} oleh ${interaction.user.tag}`);
      } catch (error) {
        logger.error('[Role Remove Error] Gagal menghapus role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Menghapus Role ❌')
          .setDescription(`Terjadi kesalahan saat menghapus role: \`${error.message}\``)
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
