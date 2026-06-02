import winston from 'winston';
import chalk from 'chalk';

const { combine, timestamp, printf } = winston.format;

// Peta simbol Unicode untuk setiap tingkat log agar terlihat profesional
const levelSymbols = {
  info: 'ℹ 🧭',
  warn: '⚠ ⚡',
  error: '✖ 🔥',
  debug: '⚙ 🛠'
};

// Format log kustom untuk console dengan simbol dan warna menggunakan Chalk
const consoleFormat = printf(({ level, message, timestamp }) => {
  const rawLevel = level.toLowerCase().trim();
  const symbol = levelSymbols[rawLevel] || '📝';

  let coloredLevel = level.toUpperCase();
  if (rawLevel === 'info') {
    coloredLevel = chalk.cyan(coloredLevel);
  } else if (rawLevel === 'warn') {
    coloredLevel = chalk.yellow(coloredLevel);
  } else if (rawLevel === 'error') {
    coloredLevel = chalk.red(coloredLevel);
  } else if (rawLevel === 'debug') {
    coloredLevel = chalk.blue(coloredLevel);
  }

  const grayTimestamp = chalk.gray(`[${timestamp}]`);
  return `${grayTimestamp} [${symbol} ${coloredLevel}]: ${message}`;
});

// Konfigurasi logger
const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Menyimpan log error ke file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    }),
    // Menyimpan seluruh log ke file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    }),
    // Menampilkan log di console dengan warna Chalk
    new winston.transports.Console({
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat)
    })
  ]
});

export default logger;
