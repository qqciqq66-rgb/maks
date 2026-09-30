import { config } from './config.js';

export class MaxApiError extends Error {
  constructor(status, body) {
    super(`MAX API ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

async function call(method, pathname, { query, body, timeoutMs = 15000 } = {}) {
  const url = new URL(pathname, config.apiBase);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: config.botToken,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await res.text();
  if (!res.ok) throw new MaxApiError(res.status, text.slice(0, 500));
  return text ? JSON.parse(text) : {};
}

export const maxApi = {
  getMe: () => call('GET', '/me'),

  getUpdates: ({ marker, timeout = 30, types } = {}) =>
    call('GET', '/updates', { query: { marker, timeout, limit: 100, types }, timeoutMs: (timeout + 10) * 1000 }),
  sendMessage: (recipient, body) =>
    call('POST', '/messages', {
      query: { user_id: recipient.userId, chat_id: recipient.chatId },
      body
    }),

  answerCallback: (callbackId, { notification, message } = {}) =>
    call('POST', '/answers', { query: { callback_id: callbackId }, body: { notification, message } }),

  subscribe: (url, updateTypes, secret) =>
    call('POST', '/subscriptions', { body: { url, update_types: updateTypes, secret: secret || undefined } })
};

export const kb = {
  keyboard: (rows) => ({ type: 'inline_keyboard', payload: { buttons: rows } }),
  callback: (text, payload) => ({ type: 'callback', text, payload }),
  link: (text, url) => ({ type: 'link', text, url }),
  message: (text) => ({ type: 'message', text }),
  openApp: (text, { webApp, contactId, payload } = {}) => ({
    type: 'open_app',
    text,
    ...(webApp ? { web_app: webApp } : {}),
    ...(contactId ? { contact_id: contactId } : {}),
    ...(payload ? { payload } : {})
  })
};

export function withoutOpenApp(attachments = []) {
  return attachments.map((a) => {
    if (a.type !== 'inline_keyboard') return a;
    const rows = a.payload.buttons
      .map((row) =>
        row
          .map((b) => {
            if (b.type !== 'open_app') return b;
            return config.webappUrl.startsWith('https://') ? kb.link(b.text, config.webappUrl) : null;
          })
          .filter(Boolean)
      )
      .filter((row) => row.length > 0);
    return { ...a, payload: { buttons: rows } };
  });
}
