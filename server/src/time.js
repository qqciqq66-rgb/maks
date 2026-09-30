import { config } from './config.js';

const OFFSET_MS = config.utcOffsetHours * 60 * 60 * 1000;

export function todayLocal(date = new Date()) {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${month}-${day}`;
}
