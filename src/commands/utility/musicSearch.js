import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import { V2Embed } from '../../utils/v2Embed.js';
import logger from '../../utils/logger.js';

// Memory cache for active search sessions (tracks pagination)
export const musicSearchCache = new Map();

/**
 * Format track duration in milliseconds to MM:SS
 */
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Helper to fetch music from iTunes Search API
 */
async function searchMusic(query) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenZero-Bot-Music-Search'
      }
    });
    if (!response.ok) {
      throw new Error(`iTunes API HTTP Error ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error('[Music Search API] Error fetching tracks:', error);
    return [];
  }
}

/**
 * Generates the music search embed and buttons
 * @param {string} sessionId
 * @param {number} pageIndex
 */
export function generateMusicSearchEmbed(sessionId, pageIndex) {
  const session = musicSearchCache.get(sessionId);
  if (!session) {
    return {
      embed: new V2Embed()
        .setTitle('Search Session Expired 🛑')
        .setDescription('Sesi pencarian ini telah kedaluwarsa. Silakan lakukan pencarian baru dengan perintah `/music-search`.')
        .setColor(0xff3333)
        .build(),
      components: []
    };
  }

  const { query, results } = session;
  const itemsPerPage = 3;
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
  const currentPage = Math.max(0, Math.min(pageIndex, totalPages - 1));

  const start = currentPage * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = results.slice(start, end);

  let description = `Hasil pencarian untuk: **"${query}"**\n\n`;

  if (pageItems.length === 0) {
    description += '*Tidak ditemukan lagu yang cocok.*';
  } else {
    pageItems.forEach((track, index) => {
      const globalIndex = start + index + 1;
      const releaseYear = track.releaseDate ? new Date(track.releaseDate).getFullYear() : 'N/A';
      description += `**${globalIndex}. ${track.trackName}** - \`${track.artistName}\`\n`;
      description += `   ↳ 💿 Album: *${track.collectionName || 'Single'}* (${releaseYear})\n`;
      description += `   ↳ ⏱️ Durasi: \`${formatDuration(track.trackTimeMillis)}\` | Genre: \`${track.primaryGenreName || 'N/A'}\`\n`;
      description += `   ↳ 🔗 [Buka di Apple Music](${track.trackViewUrl})\n\n`;
    });
  }

  description += `*Halaman ${currentPage + 1} dari ${totalPages}*`;

  // Create pagination and action buttons
  const buttonRow = new ActionRowBuilder();

  buttonRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`music_search_prev_${currentPage - 1}_${sessionId}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⬅️')
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`music_search_next_${currentPage + 1}_${sessionId}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('➡️')
      .setDisabled(currentPage >= totalPages - 1)
  );

  // If there are tracks on this page, let the user preview the first one
  if (pageItems.length > 0 && pageItems[0].previewUrl) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setLabel('Preview Teratas')
        .setStyle(ButtonStyle.Link)
        .setURL(pageItems[0].previewUrl)
        .setEmoji('🎵')
    );
  }

  const embed = new V2Embed()
    .setTitle('Hasil Pencarian Musik 🎵')
    .setDescription(description)
    .addActionRow(buttonRow);

  return {
    embed: embed.build(),
    components: [embed.build()]
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('music-search')
    .setDescription('Mencari lagu atau musik secara online.')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Nama lagu atau penyanyi yang ingin dicari')
        .setRequired(true)
    )
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const query = interaction.options.getString('query');
    await interaction.deferReply();

    logger.info(`[Music Search] Menjalankan pencarian untuk: "${query}"`);
    const results = await searchMusic(query);

    if (results.length === 0) {
      const noResultsEmbed = new V2Embed()
        .setTitle('Musik Tidak Ditemukan 🔍')
        .setDescription(`Tidak ditemukan hasil untuk pencarian lagu **"${query}"**.`)
        .build();

      return interaction.editReply({
        components: [noResultsEmbed],
        flags: MessageFlags.IsComponentsV2
      });
    }

    // Generate unique session ID for this search interaction
    const sessionId = `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    musicSearchCache.set(sessionId, {
      query,
      results,
      timestamp: Date.now()
    });

    // Clean up cache after 10 minutes to save memory
    setTimeout(() => {
      musicSearchCache.delete(sessionId);
    }, 10 * 60 * 1000);

    const { embed } = generateMusicSearchEmbed(sessionId, 0);

    await interaction.editReply({
      components: [embed],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
