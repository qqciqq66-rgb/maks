import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: int(process.env.PORT, 8080),

  botToken: process.env.MAX_BOT_TOKEN || '',
  apiBase: process.env.MAX_API_BASE || 'https://platform-api2.max.ru',

  botMode: process.env.BOT_MODE || 'polling',
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  webappUrl: process.env.WEBAPP_URL || '',
  webappName: process.env.MAX_WEBAPP_NAME || '',
  devAuth: bool(process.env.DEV_AUTH, false),
  initDataMaxAgeSec: int(process.env.INIT_DATA_MAX_AGE_SEC, 24 * 60 * 60),
  dbPath: path.resolve(rootDir, process.env.DB_PATH || './db/events.xlsx'),
  dataDir: path.resolve(rootDir, process.env.DATA_DIR || './data'),
  staticDir: path.resolve(rootDir, process.env.STATIC_DIR || '../webapp/dist'),

  city: 'Красноярск',
  utcOffsetHours: 7
};

export const botEnabled = () => Boolean(config.botToken) && config.botMode !== 'off';
