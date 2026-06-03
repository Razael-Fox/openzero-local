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
    )
    // SUBCOMMAND: ID
    .addSubcommand((subcommand) =>
      subcommand
        .setName('id')
        .setDescription('Mengecek informasi ID dari role spesifik.')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Role yang ingin dicek ID-nya')
            .setRequired(true)
        )
    )
    // SUBCOMMAND: CREATE
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Membuat role baru dengan template permission tertentu.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Nama role yang ingin dibuat')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Pilih template permission role')
            .setRequired(true)
            .addChoices(
              { name: 'Owner (Administrator)', value: 'owner' },
              { name: 'Admin (Manage Server/Roles/Channels)', value: 'admin' },
              { name: 'Mods (Kick/Ban/Mute/Manage Messages)', value: 'mods' },
              { name: 'Member (Read/Write/Connect)', value: 'member' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('color')
            .setDescription('Kode warna HEX untuk role (contoh: #FFD700) (opsional)')
            .setRequired(false)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (subcommand === 'id') {
      try {
        const targetRole = interaction.options.getRole('role');

        const embedInfo = new V2Embed()
          .setTitle('Informasi ID Role 🔍')
          .setDescription(
            `*   **Nama Role:** ${targetRole}\n` +
            `*   **Nama Teks:** \`${targetRole.name}\`\n` +
            `*   **ID Role:** \`${targetRole.id}\`\n` +
            `*   **Warna Hex:** \`${targetRole.hexColor}\`\n` +
            `*   **Posisi:** \`${targetRole.position}\``
          )
          .build();

        await interaction.editReply({
          components: [embedInfo],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role ID Checked] ${interaction.user.tag} mengecek ID untuk role "${targetRole.name}"`);
      } catch (error) {
        logger.error('[Role ID Error] Gagal mengambil informasi ID role:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Mengecek ID Role ❌')
          .setDescription(`Terjadi kesalahan saat memproses permintaan: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    if (subcommand === 'create') {
      try {
        const name = interaction.options.getString('name');
        const template = interaction.options.getString('template');
        const hexColorInput = interaction.options.getString('color') || null;

        // Validasi input warna HEX jika disediakan
        let roleColor = 0; // Default: tanpa warna kustom (Abu-abu Discord)
        if (hexColorInput) {
          const hexRegex = /^#?[0-9A-F]{6}$/i;
          if (!hexRegex.test(hexColorInput)) {
            const embedError = new V2Embed()
              .setTitle('Warna Tidak Valid ❌')
              .setDescription('Format warna HEX salah. Harap gunakan format seperti `#FFD700` atau `FFD700`.')
              .setColor(0xff0000)
              .build();

            return await interaction.editReply({
              components: [embedError],
              flags: MessageFlags.IsComponentsV2
            });
          }
          // Konversi HEX string ke angka desimal yang diterima discord.js
          const cleanHex = hexColorInput.replace('#', '');
          roleColor = parseInt(cleanHex, 16);
        }

        // Definisi set permissions berdasarkan template
        let permissions = [];
        let defaultColor = roleColor;

        switch (template) {
          case 'owner':
            permissions = [PermissionFlagsBits.Administrator];
            if (!hexColorInput) defaultColor = 0xe91e63; // Pink kemerahan untuk Owner jika warna kosong
            break;
          case 'admin':
            permissions = [
              PermissionFlagsBits.ManageGuild,
              PermissionFlagsBits.ManageRoles,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.KickMembers,
              PermissionFlagsBits.BanMembers,
              PermissionFlagsBits.ViewAuditLog,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ];
            if (!hexColorInput) defaultColor = 0x3498db; // Biru untuk Admin jika warna kosong
            break;
          case 'mods':
            permissions = [
              PermissionFlagsBits.KickMembers,
              PermissionFlagsBits.BanMembers,
              PermissionFlagsBits.ViewAuditLog,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ];
            if (!hexColorInput) defaultColor = 0x2ecc71; // Hijau untuk Mods jika warna kosong
            break;
          case 'member':
            permissions = [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.UseApplicationCommands
            ];
            if (!hexColorInput) defaultColor = 0x979c9f; // Abu-abu terang untuk Member jika warna kosong
            break;
        }

        // Membuat role baru di server
        const newRole = await interaction.guild.roles.create({
          name: name,
          permissions: permissions,
          color: defaultColor,
          reason: `Dibuat oleh ${interaction.user.tag} menggunakan subcommand /role create dengan template ${template}.`
        });

        const embedSuccess = new V2Embed()
          .setTitle('Role Berhasil Dibuat! 🎉')
          .setDescription(
            `*   **Nama Role:** ${newRole}\n` +
            `*   **Nama Teks:** \`${newRole.name}\`\n` +
            `*   **ID Role:** \`${newRole.id}\`\n` +
            `*   **Template Permission:** \`${template.toUpperCase()}\`\n` +
            `*   **Warna Hex:** \`${newRole.hexColor}\``
          )
          .build();

        await interaction.editReply({
          components: [embedSuccess],
          flags: MessageFlags.IsComponentsV2
        });

        logger.info(`[Role Created] Role "${newRole.name}" berhasil dibuat oleh ${interaction.user.tag} dengan template ${template}`);
      } catch (error) {
        logger.error('[Role Create Error] Gagal membuat role baru:', error);

        const embedError = new V2Embed()
          .setTitle('Gagal Membuat Role ❌')
          .setDescription(`Terjadi kesalahan saat memproses pembuatan role: \`${error.message}\``)
          .setColor(0xff0000)
          .build();

        await interaction.editReply({
          components: [embedError],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('role');

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
