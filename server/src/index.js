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
let stopping = false;

async function startBot() {
  const candidate = new Bot(store);
  let delay = 5000;
  while (!stopping) {
    try {
      await candidate.init();
      if (config.botMode === 'webhook') await candidate.startWebhook();
      else candidate.startPolling();
      bot = candidate;
      return;
    } catch (err) {
      const reason = err.cause?.code ? `${err.message} (${err.cause.code})` : err.message;
      console.error(`[bot] не удалось запустить бота, повтор через ${delay / 1000} с:`, reason);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 60000);
    }
  }
}

if (botEnabled()) {
  startBot();
} else {
  console.warn('[bot] MAX_BOT_TOKEN не задан или BOT_MODE=off — бот отключён, мини-приложение работает');
}

const server = createServer(createApp({ catalog, getBot: () => bot }));
server.listen(config.port, () => {
  console.log(`[http] «Решено» слушает порт ${config.port}`);
});

function shutdown(signal) {
  console.log(`[app] получен ${signal}, останавливаемся`);
  stopping = true;
  bot?.stop();
  server.close(async () => {
    await store.writeChain;
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
