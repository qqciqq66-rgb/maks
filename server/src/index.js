import { createServer } from 'node:http';

import { createApp } from './app.js';
import { Bot } from './bot.js';
import { botEnabled, config } from './config.js';
import { loadCatalog } from './data/catalog.js';
import { Store } from './store.js';

const catalog = loadCatalog(config.dbPath);
console.log(`[catalog] загружено мероприятий: ${catalog.events.length}, тегов: ${catalog.tags.length} (${config.dbPath})`);

const store = new Store(config.dataDir);
await store.load();

let bot = null;
if (botEnabled()) {
  bot = new Bot(store);
  try {
    await bot.init();
    if (config.botMode === 'webhook') await bot.startWebhook();
    else bot.startPolling();
  } catch (err) {
    console.error('[bot] не удалось запустить бота, работаем без него:', err.message);
    bot = null;
  }
} else {
  console.warn('[bot] MAX_BOT_TOKEN не задан или BOT_MODE=off — бот отключён, мини-приложение работает');
}

const server = createServer(createApp({ catalog, getBot: () => bot }));
server.listen(config.port, () => {
  console.log(`[http] «Решено» слушает порт ${config.port}`);
});

function shutdown(signal) {
  console.log(`[app] получен ${signal}, останавливаемся`);
  bot?.stop();
  server.close(async () => {
    await store.writeChain;
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
