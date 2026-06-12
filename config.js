// Managed by Razael-Fox Bot
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SequentialColor } from './src/utils/color.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTest = process.env.NODE_ENV === 'test';
const dbName = isTest ? 'database-test.json' : 'database.json';
const dbDir = path.resolve(__dirname, 'data');
const dbPath = path.join(dbDir, dbName);

export const config = {
  // Global Credentials & Environment
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerId: process.env.OWNER_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
  sentryDsn: process.env.SENTRY_DSN,
  language: process.env.BOT_LANGUAGE || 'en',

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },

  // Groq API Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'gemma2-9b-it'
  },

  // Local JSON Database Configuration
  database: {
    dir: dbDir,
    name: dbName,
    path: dbPath
  },

  // Embed Colors (Sequential Rotation Strategy)
  colorStrategy: new SequentialColor([0x6e4cc1, 0x242221, 0xf58e25, 0xfdfdfd]),
  get embedColor() {
    return this.colorStrategy.getColor();
  },

  // Bot Status & Presence Config
  activity: {
    name: '/help | /menu',
    type: 'WATCHING',
    status: 'online',
    details: 'View commands helper',
    state: 'Active',
    assets: {
      largeImage: 'https://discord.c99.nl/widget/theme-1/1511151761660838049.png',
      largeText: 'OpenZero Bot',
      smallImage: 'https://i.imgur.com/pYVjN18.png',
      smallText: 'Support System'
    },
    buttons: [
      {
        label: 'Support Server',
        url: 'https://discord.gg/openzero'
      }
    ]
  },

  // Obtainium Dashboard Message Config
  obtainium: {
    channelId: '1511326472219001014',
    messageId: '1511327184546042019'
  },

  // New Guild Member Welcome Channel Config
  welcome: {
    channelId: '1511326472219001014'
  }
};
