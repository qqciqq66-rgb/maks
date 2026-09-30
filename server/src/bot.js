import { config } from './config.js';
import { kb, MaxApiError, maxApi, withoutOpenApp } from './maxApi.js';

const UPDATE_TYPES = ['bot_started', 'message_created', 'message_callback'];

export class Bot {
  constructor(store) {
    this.store = store;
    this.me = null;
    this.running = false;
  }

  async init() {
    this.me = await maxApi.getMe();
    console.log(`[bot] авторизован как ${this.me.name ?? ''} (@${this.me.username ?? '—'})`);
  }

  async startPolling() {
    this.running = true;
    let backoff = 1000;
    console.log('[bot] режим long polling');
    while (this.running) {
      try {
        const res = await maxApi.getUpdates({ marker: this.store.state.botMarker ?? undefined, types: UPDATE_TYPES });
        for (const update of res.updates ?? []) await this.handleUpdate(update);
        if (res.marker !== undefined && res.marker !== null && res.marker !== this.store.state.botMarker) {
          await this.store.setBotMarker(res.marker);
        }
        backoff = 1000;
      } catch (err) {
        if (!this.running) break;
        console.error('[bot] ошибка получения обновлений:', err.message);
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 30000);
      }
    }
  }

  stop() {
    this.running = false;
  }

  async startWebhook() {
    await maxApi.subscribe(config.webhookUrl, UPDATE_TYPES, config.webhookSecret);
    console.log(`[bot] режим webhook: ${config.webhookUrl}`);
  }

  appButton(text, payload) {
    return kb.openApp(text, {
      webApp: config.webappName || this.me?.username,
      contactId: this.me?.user_id,
      payload
    });
  }

  async send(recipient, text, rows = []) {
    const attachments = rows.length ? [kb.keyboard(rows)] : [];
    try {
      return await maxApi.sendMessage(recipient, { text, attachments });
    } catch (err) {
      const hasOpenApp = rows.some((row) => row.some((b) => b.type === 'open_app'));
      if (err instanceof MaxApiError && err.status === 400 && hasOpenApp) {
        console.warn('[bot] open_app отклонена, отправляем запасной вариант:', err.body);
        return maxApi.sendMessage(recipient, { text, attachments: withoutOpenApp(attachments) });
      }
      throw err;
    }
  }

  async handleUpdate(update) {
    try {
      if (update.update_type === 'bot_started') return await this.sendWelcome(update);
      if (update.update_type === 'message_created') return await this.onMessage(update);
      if (update.update_type === 'message_callback') return await this.onCallback(update);
    } catch (err) {
      console.error(`[bot] ошибка обработки ${update.update_type}:`, err.message);
    }
    return undefined;
  }

  recipientOf(update) {
    const chatId = update.chat_id ?? update.message?.recipient?.chat_id;
    const userId = update.user?.user_id ?? update.message?.sender?.user_id ?? update.callback?.user?.user_id;
    return chatId ? { chatId } : { userId };
  }

  mainKeyboard() {
    return [[this.appButton('Открыть афишу')], [this.appButton('✨ Найдём вместе', 'akinator')], [kb.callback('Как это работает', 'help')]];
  }

  async sendWelcome(update) {
    const name = update.user?.first_name || update.user?.name || '';
    await this.send(
      this.recipientOf(update),
      `Привет${name ? `, ${name}` : ''}! Я «Решено» — помогаю быстро выбрать, куда пойти в Красноярске.\n\n` +
        '• Знаете, что ищете? Воспользуйтесь поиском и фильтрами.\n' +
        '• Знаете примерно? Выберите категорию: для пар, семьям, активное…\n' +
        '• Не знаете совсем? Нажмите «Найдём вместе»: задам пару вопросов, а если останется 3 варианта, брошу кубик.',
      this.mainKeyboard()
    );
  }

  async sendHelp(recipient) {
    await this.send(
      recipient,
      'В мини-приложении собраны мероприятия Красноярска на ближайшие недели.\n\n' +
        '🔎 Поиск — по названию, исполнителю, адресу и настроению.\n' +
        '⚙ Подобрать — дата, время, цена, тип, формат, возраст, «Пушкинская карта».\n' +
        '🏷 Категории и теги — быстрый выбор по компании и настроению.\n' +
        '✨ Найдём вместе — несколько вопросов и 3 варианта, из которых выбирает кубик 🎲.',
      [[this.appButton('Открыть афишу')]]
    );
  }

  async onMessage(update) {
    const text = (update.message?.body?.text || '').trim().toLowerCase();
    const recipient = this.recipientOf(update);
    if (text === '/start') return this.sendWelcome(update);
    if (text === '/help' || text === 'помощь') return this.sendHelp(recipient);
    return this.send(recipient, 'Выбирать удобнее в мини-приложении: там поиск, фильтры и «Найдём вместе».', this.mainKeyboard());
  }

  async onCallback(update) {
    const { callback } = update;
    await maxApi.answerCallback(callback.callback_id, {}).catch((err) => console.error('[bot] answer:', err.message));
    if (callback?.payload === 'help') return this.sendHelp(this.recipientOf(update));
    return undefined;
  }
}
