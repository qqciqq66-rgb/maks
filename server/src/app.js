import { timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { akinatorStep } from './akinator.js';
import { DEV_USER, validateInitData } from './auth.js';
import { config } from './config.js';
import { AGE_LEVELS, CATEGORY_ICONS } from './data/catalog.js';
import { isUpcoming, PAGE_SIZE, QUICK, searchEvents, SORTS, toCard, ValidationError } from './search.js';
import { todayLocal } from './time.js';

const MAX_BODY = 16 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Слишком большой запрос');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Некорректный JSON');
  }
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createApp({ catalog, getBot = () => null, today = () => todayLocal() }) {
  const routes = [
    ['GET', /^\/api\/health$/, () => ({ ok: true, events: catalog.events.length })],

    ['GET', /^\/api\/meta$/, () => {
      const t = today();
      const upcoming = catalog.events.filter((e) => isUpcoming(e, t));
      return {
        city: config.city,
        today: t,
        total: upcoming.length,
        pageSize: PAGE_SIZE,
        categories: catalog.categories.map((c) => ({
          value: c,
          icon: CATEGORY_ICONS[c] ?? '📍',
          count: upcoming.filter((e) => e.category === c).length
        })),
        tags: catalog.tags,
        quick: Object.entries(QUICK).map(([key, q]) => ({ key, label: q.label, icon: q.icon })),
        sorts: SORTS,
        ageLevels: AGE_LEVELS,
        priceMax: catalog.priceMax,
        dateMax: upcoming.reduce((m, e) => (e.dateEnd > m ? e.dateEnd : m), t)
      };
    }],

    ['POST', /^\/api\/events\/search$/, async (req) => searchEvents(catalog, await readJson(req), today())],

    ['GET', /^\/api\/events\/([\w-]+)$/, (req, [id]) => {
      const event = catalog.events.find((e) => e.id === id);
      if (!event) throw new HttpError(404, 'Мероприятие не найдено');
      return toCard(event, today());
    }],

    ['POST', /^\/api\/akinator$/, async (req) => akinatorStep(catalog, await readJson(req), today())],

    ['GET', /^\/api\/me$/, (req) => {
      const initData = req.headers['x-max-init-data'];
      if (initData) {
        const result = validateInitData(String(initData), config.botToken, { maxAgeSec: config.initDataMaxAgeSec });
        if (!result) throw new HttpError(401, 'Сессия MAX недействительна. Перезапустите мини-приложение.');
        return { user: result.user, startParam: result.startParam, verified: true };
      }
      if (config.devAuth) return { user: DEV_USER, startParam: '', verified: false };
      return { user: null, startParam: '', verified: false };
    }],

    ['POST', /^\/bot\/webhook$/, async (req) => {
      const bot = getBot();
      if (!bot || config.botMode !== 'webhook') throw new HttpError(404, 'Not found');
      if (config.webhookSecret && !safeEqual(req.headers['x-max-bot-api-secret'] ?? '', config.webhookSecret)) {
        throw new HttpError(403, 'Forbidden');
      }
      const update = await readJson(req);
      bot.handleUpdate(update);
      return { ok: true };
    }]
  ];

  async function serveStatic(req, res, pathname) {
    const root = config.staticDir;
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, 'Некорректный адрес');
    }
    let filePath = path.normalize(path.join(root, decoded));
    if (filePath !== root && !filePath.startsWith(root + path.sep)) throw new HttpError(403, 'Forbidden');
    let info = await stat(filePath).catch(() => null);
    if (!info || info.isDirectory()) {
      filePath = path.join(root, 'index.html');
      info = await stat(filePath).catch(() => null);
      if (!info) throw new HttpError(404, 'Фронтенд не собран: выполните npm run build в папке webapp');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(filePath).pipe(res);
    return undefined;
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      for (const [method, pattern, fn] of routes) {
        const match = url.pathname.match(pattern);
        if (!match || req.method !== method) continue;
        return sendJson(res, 200, await fn(req, match.slice(1)));
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/bot/')) throw new HttpError(404, 'Метод не найден');
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      return await serveStatic(req, res, url.pathname);
    } catch (err) {
      if (err instanceof ValidationError) return sendJson(res, 400, { error: err.message });
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      console.error('[http] необработанная ошибка:', err);
      return sendJson(res, 500, { error: 'Что-то пошло не так. Попробуйте ещё раз.' });
    }
  };
}
