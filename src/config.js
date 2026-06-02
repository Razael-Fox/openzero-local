/**
 * Konfigurasi Global Bot Discord
 */
export const config = {
  // Warna aksen utama untuk seluruh V2Embed (Hexadecimal)
  embedColor: 0xffd700, // Warna Emas (Gold) Komunitas

  // Konfigurasi Status Kehadiran (Presence Activity) Bot
  activity: {
    name: 'Grand Theft Auto VI',
    // Pilihan tipe: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
    type: 'PLAYING',
    details: 'Exploring Leonida & Vice City',
    state: 'Campaign: 68% Completed',
    assets: {
      largeImage: 'https://i.imgur.com/ByUhao8.png', // GTA VI Artwork
      largeText: 'Grand Theft Auto VI',
      smallImage: 'https://i.imgur.com/pYVjN18.png', // Rockstar Games Logo
      smallText: 'Leonida County'
    },
    buttons: [
      {
        label: 'Join Game',
        url: 'https://discord.gg/openzero' // Target URL untuk tombol Join Game
      }
    ]
  },

  // Target Discord Channel dan Message ID untuk list Obtainium
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  }
};
